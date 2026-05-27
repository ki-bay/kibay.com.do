// cardnet-verify-session — Botón de Pago (Webpantalla) result verification.
// =============================================================================
// Called by the SPA's /checkout/cardnet/return page after CARDNET redirects
// the buyer back from its hosted payment UI. We GET CARDNET's session
// endpoint with the SESSION GUID + sk (session-key) to retrieve the final
// transaction result, then flip the order to 'paid' (or 'payment_failed').
//
// Auth model: anon-callable, same dual-auth as create-session (owner JWT or
// guest_lookup_token in body). The SESSION + session_key were persisted on
// the order at create time so the SPA never has to pass them — we look
// them up server-side, which keeps session_key out of the browser.
//
// Required Edge Function secrets (same as cardnet-create-session):
//   CARDNET_SESSION_URL          base URL for /sessions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const sessionUrl = Deno.env.get('CARDNET_SESSION_URL') || '';

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

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
	if (!sessionUrl) return json({ error: 'cardnet_not_configured' }, 503);

	let body: { order_id?: string; token?: string };
	try {
		body = (await req.json()) as { order_id?: string; token?: string };
	} catch {
		return json({ error: 'bad_json' }, 400);
	}
	const orderId = body?.order_id;
	if (!orderId) return json({ error: 'order_id required' }, 400);

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
	const { data: order } = await admin
		.from('orders')
		.select('id, order_number, user_id, total_amount, currency, status, guest_lookup_token, cardnet_session_id, cardnet_session_key')
		.eq('id', orderId)
		.maybeSingle();
	if (!order) return json({ error: 'order_not_found' }, 404);

	const ownerMatches = order.user_id && userId && order.user_id === userId;
	const guestMatches = order.user_id === null && body.token && body.token === order.guest_lookup_token;
	if (!ownerMatches && !guestMatches) return json({ error: 'unauthorized_for_order' }, 403);

	// Already paid? Short-circuit — repeat verify calls are safe.
	if (order.status === 'paid') {
		return json({ status: 'paid', order_id: order.id, already: true });
	}

	if (!order.cardnet_session_id || !order.cardnet_session_key) {
		return json({ error: 'no_cardnet_session_on_order' }, 400);
	}

	// GET CARDNET's session endpoint.
	const url = `${sessionUrl}/${encodeURIComponent(order.cardnet_session_id)}?sk=${encodeURIComponent(order.cardnet_session_key)}`;
	let result: Record<string, unknown> = {};
	let rawText = '';
	try {
		const resp = await fetch(url, {
			method: 'GET',
			headers: { Accept: 'application/json' },
		});
		rawText = await resp.text();
		try {
			result = rawText ? JSON.parse(rawText) : {};
		} catch {
			return json(
				{
					error: 'cardnet_non_json',
					status: resp.status,
					content_type: resp.headers.get('content-type'),
					body: rawText.slice(0, 500),
				},
				502,
			);
		}
		if (!resp.ok) {
			console.error('cardnet-verify-session: HTTP', resp.status, result);
			return json({ error: 'cardnet_verify_failed', status: resp.status, detail: result }, 502);
		}
	} catch (e) {
		console.error('cardnet-verify-session: fetch threw', e);
		return json({ error: 'cardnet_fetch_failed', detail: String(e) }, 502);
	}

	const responseCode = String(result.ResponseCode || result.responseCode || '');
	const remoteResponseCode = String(result.RemoteResponseCode || result.remoteResponseCode || '');
	const authorizationCode = result.AuthorizationCode ? String(result.AuthorizationCode) : null;
	const retrievalRef = result.RetrievalReferenceNumber || result.RetrivalReferenceNumber
		? String(result.RetrievalReferenceNumber || result.RetrivalReferenceNumber)
		: null;
	const txToken = result.TxToken ? String(result.TxToken) : null;
	const creditCardNumber = result.CreditCardNumber ? String(result.CreditCardNumber) : null;

	const approved = responseCode === '00';
	const now = new Date().toISOString();

	if (!approved) {
		// Could be a decline, a session-not-found ('404'), TF (3DS failed), or
		// any of the codes in the response-code table.
		await admin
			.from('orders')
			.update({
				status: 'payment_failed',
				cardnet_response_code: responseCode || null,
				cardnet_response_message: humanizeResponseCode(responseCode || remoteResponseCode) || null,
			})
			.eq('id', order.id);
		return json({
			status: 'failed',
			order_id: order.id,
			code: responseCode || remoteResponseCode,
			message: humanizeResponseCode(responseCode || remoteResponseCode),
		});
	}

	// Approved — flip order to paid. The same inventory-decrement trigger
	// that fires on Stripe success fires here too (it watches `status` ->
	// 'paid').
	const { error: updErr } = await admin
		.from('orders')
		.update({
			status: 'paid',
			paid_at: now,
			payment_method: 'cardnet',
			cardnet_authorization_code: authorizationCode,
			cardnet_reference_number: retrievalRef,
			cardnet_tx_token: txToken,
			cardnet_response_code: responseCode,
			cardnet_response_message: 'Approved',
		})
		.eq('id', order.id);
	if (updErr) {
		console.error('cardnet-verify-session: order update failed', updErr);
		return json({ error: 'order_update_failed' }, 500);
	}

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
		console.error('cardnet-verify-session: send-order-email failed (non-fatal)', e);
	}

	return json({
		status: 'paid',
		order_id: order.id,
		authorization_code: authorizationCode,
		credit_card_last4: creditCardNumber ? creditCardNumber.slice(-4) : null,
	});
});

// Minimal human-readable mapping for the common CARDNET response codes the
// buyer might see. Used for the failure message; the full code table is on
// the admin order detail.
function humanizeResponseCode(code: string): string | null {
	if (!code) return null;
	const map: Record<string, string> = {
		'00': 'Approved',
		'01': 'Call your bank',
		'02': 'Call your bank',
		'03': 'Invalid merchant',
		'04': 'Card declined',
		'05': 'Declined',
		'12': 'Invalid transaction',
		'13': 'Invalid amount',
		'14': 'Invalid card number',
		'33': 'Expired card',
		'41': 'Lost card',
		'43': 'Stolen card',
		'51': 'Insufficient funds',
		'54': 'Expired card',
		'57': 'Transaction not allowed',
		'58': 'Transaction not allowed on terminal',
		'61': 'Withdrawal limit exceeded',
		'62': 'Restricted card',
		'65': 'Activity count exceeded',
		'75': 'PIN attempts exceeded',
		'91': 'Issuer unavailable',
		'94': 'Duplicate transaction',
		'96': 'System error',
		'404': 'Session not found or expired',
		TF: '3DS authentication failed',
	};
	return map[code] || `Declined (code ${code})`;
}
