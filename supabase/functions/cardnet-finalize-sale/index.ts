// cardnet-finalize-sale
// =============================================================================
// Step 2 of the CARDNET ZTRANS direct payment flow. Called by the SPA after
// either (a) the frictionless /authentication returned transStatus="Y", or
// (b) the user completed the 3DS challenge iframe and our return page
// postMessaged the parent.
//
// Sequence:
//   1. POST {CARDNET_3DS_BASE_URL}/servicios/3ds/server/status
//        → returns authenticationValue (AVV) + ECI + transStatus
//   2. POST {CARDNET_API_BASE_URL}/idenpotency-keys (text/plain)
//        → returns an idempotency-key
//   3. POST {CARDNET_API_BASE_URL}/transactions/sales
//        → returns response-code (00 = approved) + pnRef + approval-code
//
// If response-code "00" → mark order paid, fire confirmation + admin emails.
//
// Card data discipline: PAN/CVV live only in memory for the lifetime of
// this request. They are never logged, never written to disk, never
// returned to the SPA.
//
// Required Edge Function secrets:
//   CARDNET_3DS_BASE_URL       sandbox: https://lab.cardnet.com.do
//                              prod:    https://servicios.cardnet.com.do
//   CARDNET_API_BASE_URL       sandbox: https://lab.cardnet.com.do/api/payment
//                              prod:    https://ecommerce.cardnet.com.do/api/payment
//   CARDNET_INTEGRATOR_CODE    sandbox: 349011300
//   CARDNET_API_KEY            sandbox: 66827137-4ad5-4a37-8e87-6299fe2d5b57
//   CARDNET_MERCHANT_ID        sandbox: 349041263
//   CARDNET_TERMINAL_ID        sandbox: 77777777

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const cardnet = {
	threeDsBaseUrl: Deno.env.get('CARDNET_3DS_BASE_URL') || '',
	apiBaseUrl: Deno.env.get('CARDNET_API_BASE_URL') || '',
	integratorCode: Deno.env.get('CARDNET_INTEGRATOR_CODE') || '',
	apiKey: Deno.env.get('CARDNET_API_KEY') || '',
	merchantId: Deno.env.get('CARDNET_MERCHANT_ID') || '',
	terminalId: Deno.env.get('CARDNET_TERMINAL_ID') || '',
};

const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...cors, 'Content-Type': 'application/json' },
	});
}

async function sha512Hex(msg: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(msg));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

type Body = {
	order_id?: string;
	token?: string; // guest_lookup_token for guest orders
	card?: {
		number?: string;
		cvv?: string;
		exp_month?: string;
		exp_year?: string;
		holder_name?: string;
	};
};

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

	const missing: string[] = [];
	if (!cardnet.threeDsBaseUrl) missing.push('CARDNET_3DS_BASE_URL');
	if (!cardnet.apiBaseUrl) missing.push('CARDNET_API_BASE_URL');
	if (!cardnet.integratorCode) missing.push('CARDNET_INTEGRATOR_CODE');
	if (!cardnet.apiKey) missing.push('CARDNET_API_KEY');
	if (!cardnet.merchantId) missing.push('CARDNET_MERCHANT_ID');
	if (!cardnet.terminalId) missing.push('CARDNET_TERMINAL_ID');
	if (missing.length) return json({ error: 'CARDNET not configured', missing }, 503);

	let body: Body;
	try {
		body = (await req.json()) as Body;
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}

	const orderId = body?.order_id;
	if (!orderId) return json({ error: 'order_id required' }, 400);

	const card = body.card || {};
	const cardNumber = (card.number || '').replace(/\s+/g, '');
	const cvv = card.cvv || '';
	const expMonth = (card.exp_month || '').padStart(2, '0');
	const expYear = (card.exp_year || '').slice(-2);
	if (!/^\d{13,19}$/.test(cardNumber)) return json({ error: 'Invalid card number' }, 400);
	if (!/^\d{3,4}$/.test(cvv)) return json({ error: 'Invalid CVV' }, 400);
	if (!/^(0[1-9]|1[0-2])$/.test(expMonth)) return json({ error: 'Invalid expiration month' }, 400);
	if (!/^\d{2}$/.test(expYear)) return json({ error: 'Invalid expiration year' }, 400);

	// Auth — owner with valid JWT or guest with order's guest_lookup_token.
	const authHeader = req.headers.get('authorization') || '';
	const jwt = authHeader.replace(/^Bearer\s+/i, '');
	let userId: string | null = null;
	if (jwt) {
		const userClient = createClient(supabaseUrl, anonKey, {
			global: { headers: { Authorization: `Bearer ${jwt}` } },
		});
		const { data: u } = await userClient.auth.getUser();
		userId = u?.user?.id || null;
	}

	const admin = createClient(supabaseUrl, serviceKey);
	const { data: order, error: orderErr } = await admin
		.from('orders')
		.select(
			'id, order_number, user_id, total_amount, currency, status, guest_lookup_token, cardnet_integrator_tx_id, cardnet_three_ds_server_trans_id',
		)
		.eq('id', orderId)
		.single();
	if (orderErr || !order) return json({ error: 'Order not found' }, 404);

	const ownerMatches = order.user_id && userId && order.user_id === userId;
	const guestMatches = order.user_id === null && body.token && body.token === order.guest_lookup_token;
	if (!ownerMatches && !guestMatches) return json({ error: 'Unauthorized for this order' }, 403);
	if (order.status === 'paid') return json({ status: 'paid', order_id: order.id });

	if (!order.cardnet_three_ds_server_trans_id || !order.cardnet_integrator_tx_id) {
		return json({ error: 'Order has no 3DS authentication on file — call cardnet-auth-3ds first' }, 400);
	}

	const integratorTxId: string = order.cardnet_integrator_tx_id;
	const threeDSServerTransID: string = order.cardnet_three_ds_server_trans_id;
	const purchaseAmount = String(order.total_amount); // minor units, must match what auth saw
	const currencyCode = order.currency === 'USD' ? '840' : '214';

	// ---- 1. Query /3ds/server/status ---------------------------------------
	// Signature = SHA-512(integratorCode + integratorTxId + purchaseAmount + apiKey)
	// (NOTE the difference from /authentication: no cardExpiryDate.)
	const statusSig = await sha512Hex(
		cardnet.integratorCode + integratorTxId + purchaseAmount + cardnet.apiKey,
	);

	const statusResp = await fetch(`${cardnet.threeDsBaseUrl}/servicios/3ds/server/status`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({
			integratorCode: cardnet.integratorCode,
			threeDSServerTransID,
			signature: statusSig,
		}),
	});
	const statusBody = (await statusResp.json().catch(() => ({}))) as Record<string, unknown>;
	if (!statusResp.ok) {
		console.error('CARDNET /status failed', statusResp.status, statusBody);
		return json({ error: 'CARDNET status request failed', status: statusResp.status, detail: statusBody }, 502);
	}

	const transStatus = String(statusBody.transStatus || '');
	const authenticationValue = String(statusBody.authenticationValue || '');
	const eci = String(statusBody.eci || '');
	const programProtocol = String(statusBody.messageVersion || '2.1.0');
	const dsTransID = String(statusBody.dsTransID || '');

	if (transStatus !== 'Y') {
		// Authentication did not complete successfully — don't attempt the
		// sale. 'N' = denied by issuer, 'U' = unable, 'R' = rejected, 'A' =
		// attempts (we allow attempts since networks treat it as authenticated,
		// but most issuers require Y).
		await admin
			.from('orders')
			.update({
				status: 'payment_failed',
				cardnet_response_code: '4901',
				cardnet_response_message: `3DS authentication failed (transStatus=${transStatus})`,
				cardnet_eci: eci || null,
			})
			.eq('id', order.id);
		return json({
			status: 'failed',
			code: '4901',
			message: `3DS authentication failed (transStatus=${transStatus})`,
		});
	}

	// ---- 2. Get an idempotency-key from CARDNET ----------------------------
	const ikeyResp = await fetch(`${cardnet.apiBaseUrl}/idenpotency-keys`, {
		method: 'POST',
		headers: { Accept: 'text/plain' },
	});
	const ikeyText = (await ikeyResp.text()).trim();
	// Response shape per docs: "ikey:11b0de52dec7423db5815be48f914239"
	const idempotencyKey = ikeyText.replace(/^ikey:/i, '').trim();
	if (!ikeyResp.ok || !idempotencyKey) {
		console.error('CARDNET idempotency-key failed', ikeyResp.status, ikeyText);
		return json({ error: 'CARDNET idempotency-key request failed', status: ikeyResp.status }, 502);
	}

	// ---- 3. Call /transactions/sales ---------------------------------------
	// Per the ZTRANS doc the /sales amount is "decimal" — but the 3DS PDF
	// example pairs purchaseAmount "500" with /sales amount 500 (same units).
	// We send the integer minor-units to match what /authentication saw; if
	// the sandbox requires decimal major units we'll see a clear rejection
	// and adjust here.
	const referenceNumber = (order.order_number || order.id).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 15);

	const salePayload: Record<string, unknown> = {
		token: integratorTxId.replace(/-/g, '').slice(0, 12), // app-side reference; opaque
		'idempotency-key': idempotencyKey,
		'merchant-id': cardnet.merchantId,
		'terminal-id': cardnet.terminalId,
		'card-number': cardNumber,
		environment: 'ECommerce',
		'expiration-date': `${expMonth}/${expYear}`,
		cvv,
		amount: Number(purchaseAmount), // integer cents matching purchaseAmount
		currency: currencyCode,
		'invoice-number': referenceNumber,
		'client-ip': (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '0.0.0.0',
		'reference-number': referenceNumber,
		tax: 0,
		tip: 0,
		// 3DS fields from the /status response
		tds_mode: '2', // data supplied by client app (us)
		tds_servertransactionid: threeDSServerTransID,
		tds_eci: eci,
		tds_aav: authenticationValue,
		tds_programprotocol: programProtocol,
		tds_dstransactionid: dsTransID,
		tds_status: 'Y',
	};

	const saleResp = await fetch(`${cardnet.apiBaseUrl}/transactions/sales`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify(salePayload),
	});
	const saleBody = (await saleResp.json().catch(() => ({}))) as Record<string, unknown>;

	const responseCode = String(saleBody['response-code'] || '');
	const internalResponseCode = String(saleBody['internal-response-code'] || '');
	const responseDesc = String(saleBody['response-code-desc'] || '');
	const pnRef = saleBody.pnRef ? String(saleBody.pnRef) : null;
	const approvalCode = saleBody['approval-code'] ? String(saleBody['approval-code']) : null;

	const approved = responseCode === '00';

	if (!saleResp.ok || !approved) {
		console.error('CARDNET /sales rejected', saleResp.status, {
			responseCode,
			internalResponseCode,
			responseDesc,
		});
		await admin
			.from('orders')
			.update({
				status: 'payment_failed',
				cardnet_response_code: responseCode || String(saleResp.status),
				cardnet_response_message: responseDesc || internalResponseCode || 'Sale rejected',
				cardnet_eci: eci || null,
				cardnet_pn_ref: pnRef,
				cardnet_idempotency_key: idempotencyKey,
			})
			.eq('id', order.id);
		return json({
			status: 'failed',
			code: responseCode || String(saleResp.status),
			internal_code: internalResponseCode,
			message: responseDesc || 'Sale rejected',
		});
	}

	// ---- 4. Mark paid ------------------------------------------------------
	const { error: updErr } = await admin
		.from('orders')
		.update({
			status: 'paid',
			paid_at: new Date().toISOString(),
			payment_method: 'cardnet',
			cardnet_authorization_code: approvalCode,
			cardnet_reference_number: pnRef,
			cardnet_pn_ref: pnRef,
			cardnet_response_code: responseCode,
			cardnet_response_message: responseDesc || 'Transaction Approved',
			cardnet_eci: eci,
			cardnet_idempotency_key: idempotencyKey,
		})
		.eq('id', order.id);
	if (updErr) return json({ error: 'Order update failed', detail: updErr.message }, 500);

	// Fire confirmation + admin emails (same pattern as stripe-webhook).
	try {
		await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ order_id: order.id, type: 'confirmation' }),
		});
		await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ order_id: order.id, type: 'admin_new_order' }),
		});
	} catch (e) {
		console.error('send-order-email after CARDNET paid failed (non-fatal):', e);
	}

	return json({
		status: 'paid',
		order_id: order.id,
		approval_code: approvalCode,
		pn_ref: pnRef,
	});
});
