// cardnet-create-session — Botón de Pago (Webpantalla) session creation.
// =============================================================================
// Anon-callable from the SPA when the buyer clicks "Pay with CARDNET" on the
// payment step. We POST the order params to CARDNET's /sessions endpoint and
// receive a SESSION GUID + session-key back. The SPA then builds a tiny
// form-POST to CARDNET's hosted payment page passing the SESSION as a hidden
// field; the browser is redirected to CARDNET's UI where the customer
// enters card data (zero PCI scope on us — SAQ A).
//
// CARDNET later redirects back to ReturnUrl (success) or CancelUrl (decline/
// cancel). The return page calls cardnet-verify-session to confirm the final
// transaction status via GET /sessions/<id>?sk=<key>.
//
// Per Hansel Aybar's email 2026-05-27:
//   - No apiKey, no HMAC. Botón de Pago doesn't need them.
//   - QA URLs: labservicios.cardnet.com.do (NOT lab.)
//   - Test merchant IDs: 349000000 / 58585858 / type 7997 (from postman).
//
// Required Edge Function secrets:
//   CARDNET_SESSION_URL          POST + GET base, e.g. https://labservicios.cardnet.com.do/sessions
//   CARDNET_AUTHORIZE_URL        Browser form-POST target, e.g. https://labservicios.cardnet.com.do/authorize
//   CARDNET_MERCHANT_NUMBER      e.g. 349000000 (QA) / kibay's real MID (prod)
//   CARDNET_MERCHANT_TERMINAL    e.g. 58585858 (QA)
//   CARDNET_MERCHANT_TYPE        MCC, e.g. 7997 (QA) / 5921 wine for prod
//   CARDNET_MERCHANT_NAME        40 chars max, displayed on CARDNET page
//   CARDNET_ACQUIRING_INSTITUTION_CODE   typically '349'
//   CARDNET_RETURN_URL           e.g. https://kibay.com.do/checkout/cardnet/return
//   CARDNET_CANCEL_URL           e.g. https://kibay.com.do/checkout/cardnet/cancel
//   CARDNET_TRANSACTION_TYPE     '200' = sale (per postman) or '0200' (per PDF) — keep configurable

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const cn = {
	sessionUrl: Deno.env.get('CARDNET_SESSION_URL') || '',
	authorizeUrl: Deno.env.get('CARDNET_AUTHORIZE_URL') || '',
	merchantNumber: Deno.env.get('CARDNET_MERCHANT_NUMBER') || '',
	merchantTerminal: Deno.env.get('CARDNET_MERCHANT_TERMINAL') || '',
	merchantType: Deno.env.get('CARDNET_MERCHANT_TYPE') || '7997',
	merchantName: Deno.env.get('CARDNET_MERCHANT_NAME') || 'KIBAY SANTO DOMINGO DN DO',
	acquiringCode: Deno.env.get('CARDNET_ACQUIRING_INSTITUTION_CODE') || '349',
	returnUrl: Deno.env.get('CARDNET_RETURN_URL') || 'https://kibay.com.do/checkout/cardnet/return',
	cancelUrl: Deno.env.get('CARDNET_CANCEL_URL') || 'https://kibay.com.do/checkout/cardnet/cancel',
	transactionType: Deno.env.get('CARDNET_TRANSACTION_TYPE') || '200',
	// QA-only: override the buyer's 3DS contact info so the OTP challenge
	// can be dispatched via Hansel's preconfigured test 3DS account. Leave
	// unset in production — real buyer email/phone flow through.
	test3dsEmail: Deno.env.get('CARDNET_3DS_TEST_EMAIL') || '',
	test3dsPhone: Deno.env.get('CARDNET_3DS_TEST_PHONE') || '',
	// QA-only: Hansel's known-good AVS test value (tied to whatever test card
	// data CARDNET's sandbox expects for AVS matching). Leave unset in
	// production — real buyer address flows through.
	testAvs: Deno.env.get('CARDNET_AVS_TEST_VALUE') || '',
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

// CARDNET amounts are minor units, no zero-padding — per Hansel Aybar
// 2026-08-14: "100 pesos = 10000" (last 2 digits are decimals). Our
// orders.total_amount is already stored this way, so no scaling needed,
// just stringify. The earlier 12-digit zero-padded format was wrong.
function amountToString(n: number): string {
	return String(Math.max(0, Math.round(n)));
}

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

	const missing: string[] = [];
	if (!cn.sessionUrl) missing.push('CARDNET_SESSION_URL');
	if (!cn.authorizeUrl) missing.push('CARDNET_AUTHORIZE_URL');
	if (!cn.merchantNumber) missing.push('CARDNET_MERCHANT_NUMBER');
	if (!cn.merchantTerminal) missing.push('CARDNET_MERCHANT_TERMINAL');
	if (missing.length) return json({ error: 'cardnet_not_configured', missing }, 503);

	let body: { order_id?: string; token?: string };
	try {
		body = (await req.json()) as { order_id?: string; token?: string };
	} catch {
		return json({ error: 'bad_json' }, 400);
	}

	const orderId = body?.order_id;
	if (!orderId) return json({ error: 'order_id required' }, 400);

	// Dual auth — owner JWT OR guest_lookup_token. Same pattern as the old
	// stub used.
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
		.select('id, order_number, user_id, total_amount, subtotal_amount, currency, status, guest_lookup_token, shipping_address')
		.eq('id', orderId)
		.maybeSingle();
	if (orderErr || !order) return json({ error: 'order_not_found' }, 404);

	const ownerMatches = order.user_id && userId && order.user_id === userId;
	const guestMatches = order.user_id === null && body.token && body.token === order.guest_lookup_token;
	if (!ownerMatches && !guestMatches) return json({ error: 'unauthorized_for_order' }, 403);
	if (order.status === 'paid') return json({ error: 'order_already_paid' }, 409);

	// Build the session creation payload.
	// total_amount is stored as integer minor units (cents) in DOP for CARDNET orders.
	// Tax in our orders schema is folded into total_amount; we send Tax='0' to CARDNET.
	// TransactionId/OrdenId — per Hansel's known-good example request (2026-08-14)
	// these are short plain numeric values (e.g. "14580" / "689"), not long
	// UUID-derived strings. Short numeric digits from the order id/number.
	const transactionId = (order.id || '').replace(/[^0-9]/g, '').slice(0, 6) || String(Date.now()).slice(-6);
	const ordenId = (order.order_number || '').replace(/[^0-9]/g, '').slice(-6) || transactionId;
	const amount = amountToString(order.total_amount);

	const ship = (order.shipping_address as Record<string, string>) || {};
	const buyerEmail = ship.email || '';
	const buyerMobile = (ship.phone || '').replace(/[^0-9]/g, '').slice(0, 15);
	// AVS uses the street address line; no separate billing address is collected.
	// In QA, CARDNET_AVS_TEST_VALUE overrides with Hansel's known-good test value.
	const billAddrLine1 = cn.testAvs || (ship.address || '').slice(0, 50);

	// Final return URL — append order_id (and guest token for guest checkouts)
	// so the return page can correlate back to the order.
	const returnWithOrder = (() => {
		const u = new URL(cn.returnUrl);
		u.searchParams.set('order_id', order.id);
		if (guestMatches) u.searchParams.set('token', String(order.guest_lookup_token));
		return u.toString();
	})();
	const cancelWithOrder = (() => {
		const u = new URL(cn.cancelUrl);
		u.searchParams.set('order_id', order.id);
		if (guestMatches) u.searchParams.set('token', String(order.guest_lookup_token));
		return u.toString();
	})();

	const payload: Record<string, string> = {
		TransactionType: cn.transactionType, // '200' = sale per current postman
		CurrencyCode: order.currency === 'USD' ? '840' : '214',
		AcquiringInstitutionCode: cn.acquiringCode,
		MerchantType: cn.merchantType,
		MerchantNumber: cn.merchantNumber,
		MerchantTerminal: cn.merchantTerminal,
		MerchantTerminal_amex: '00000001',
		ReturnUrl: returnWithOrder,
		CancelUrl: cancelWithOrder,
		PageLanguaje: order.currency === 'USD' ? 'ENG' : 'ESP',
		OrdenId: ordenId,
		TransactionId: transactionId,
		Tax: '0',
		MerchantName: cn.merchantName.slice(0, 40),
		AVS: billAddrLine1 || '',
		Amount: amount,
	};

	// 3DS fields — per Hansel Aybar 2026-08-14, only 3DS_email + 3DS_mobilePhone
	// are actually required. Everything else (workPhone, homePhone, the full
	// billAddr block) was a guess from an inconsistent spec PDF and has been
	// dropped entirely — sending it was not needed and may have been part of
	// what triggered the extra captcha/verification step on their hosted page.
	//
	// QA testing requires Hansel's preconfigured test 3DS account (otherwise
	// the OTP challenge can't be dispatched). When CARDNET_3DS_TEST_EMAIL/
	// CARDNET_3DS_TEST_PHONE are set, we override the buyer's contact info for
	// these two fields — that's what drives OTP routing in the sandbox.
	const effective3dsEmail = cn.test3dsEmail || buyerEmail;
	const effective3dsPhone = cn.test3dsPhone || buyerMobile;
	if (effective3dsEmail) payload['3DS_email'] = effective3dsEmail;
	if (effective3dsPhone) payload['3DS_mobilePhone'] = effective3dsPhone;

	// POST to CARDNET.
	let cardnetBody: Record<string, unknown> = {};
	let cardnetText = '';
	try {
		const resp = await fetch(cn.sessionUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify(payload),
		});
		cardnetText = await resp.text();
		try {
			cardnetBody = cardnetText ? JSON.parse(cardnetText) : {};
		} catch {
			return json(
				{
					error: 'cardnet_non_json',
					status: resp.status,
					content_type: resp.headers.get('content-type'),
					body: cardnetText.slice(0, 500),
				},
				502,
			);
		}
		if (!resp.ok) {
			console.error('cardnet-create-session: HTTP', resp.status, cardnetBody);
			return json(
				{
					error: 'cardnet_create_failed',
					status: resp.status,
					detail: cardnetBody,
				},
				502,
			);
		}
	} catch (e) {
		console.error('cardnet-create-session: fetch threw', e);
		return json({ error: 'cardnet_fetch_failed', detail: String(e) }, 502);
	}

	const session = String(cardnetBody.SESSION || cardnetBody.Session || '');
	const sessionKey = String(cardnetBody['session-key'] || cardnetBody.sessionKey || '');
	if (!session || !sessionKey) {
		return json({ error: 'cardnet_no_session', detail: cardnetBody, raw: cardnetText.slice(0, 500) }, 502);
	}

	// Persist the session id + key on the order so verify can fetch them.
	await admin
		.from('orders')
		.update({
			payment_method: 'cardnet',
			cardnet_session_id: session,
			cardnet_session_key: sessionKey,
		})
		.eq('id', order.id);

	return json({
		session,
		authorize_url: cn.authorizeUrl,
		return_url: returnWithOrder,
		// session_key intentionally NOT returned — it's a secret the SPA
		// never needs (verify is called server-side with the order_id).
	});
});
