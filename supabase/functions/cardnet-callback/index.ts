// cardnet-callback — receives CARDNET's own POST-back on ReturnUrl/CancelUrl.
// =============================================================================
// Root-cause fix for two stacked bugs found live on 2026-08-14:
//
// 1. ReturnUrl/CancelUrl used to point straight at the static SPA
//    (kibay.com.do, Cloudflare Pages), which 303-redirects any POST into a
//    GET — silently discarding the body CARDNET sends. The later
//    GET /sessions/<id> lookup then came back `rspdata_not_found`, because by
//    then CARDNET had nothing left to hand over. This function is a real
//    POST-capable backend that reads the body directly instead.
//
// 2. CARDNET actually posts to this URL in two different shapes:
//      - an interim ack, no ResponseCode:
//        `SESSION=<guid>&Description=Transaction+Received...`
//      - the final result, with ResponseCode:
//        `ResponseCode=<code>&SESSION=<guid>&AuthorizationCode=...`
//    Treating the interim ack as a decline (no code = not '00' = failed) was
//    wrong — it showed "Pago cancelado" for orders that were genuinely
//    approved a moment later. When there's no ResponseCode yet, this isn't a
//    result — defer to the SPA's /checkout/cardnet/return page, which polls
//    cardnet-verify-session (GET /sessions/<id> — confirmed working now that
//    the request payload matches CARDNET's expected format) until the real
//    outcome is known.
//
// Note: the SESSION value in this callback is CARDNET's *internal auth-flow*
// GUID (the `s` query param on their /auth page), NOT the SESSION returned
// from POST /sessions at create-session time — confirmed these differ live.
// So correlation relies on order_id (+ guest token) in the callback URL's
// query string, exactly like cardnet-verify-session already does — those are
// values we minted and only gave to CARDNET, via ReturnUrl/CancelUrl.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// generate-order-invoice checks this dedicated token rather than serviceKey
// (see that function's own comment on why).
const relayToken = Deno.env.get('TRANSACTIONAL_RELAY_TOKEN') || '';
const siteUrl = Deno.env.get('SITE_URL') || 'https://kibay.com.do';

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
		TF: '3DS authentication failed',
	};
	return map[code] || `Declined (code ${code})`;
}

serve(async (req) => {
	const url = new URL(req.url);
	const orderId = url.searchParams.get('order_id') || '';
	const token = url.searchParams.get('token') || '';

	const redirectTo = (path: string, extra: Record<string, string> = {}) => {
		const u = new URL(path, siteUrl);
		if (orderId) u.searchParams.set('order_id', orderId);
		if (token) u.searchParams.set('token', token);
		for (const [k, v] of Object.entries(extra)) u.searchParams.set(k, v);
		return new Response(null, { status: 302, headers: { Location: u.toString() } });
	};

	if (!orderId) return redirectTo('/checkout/cardnet/cancel');

	if (req.method !== 'POST') {
		// A bare GET (bookmark, retry, etc) with no result payload — let the
		// return page's own verify-session polling resolve the real outcome.
		return redirectTo('/checkout/cardnet/return');
	}

	let form: URLSearchParams;
	try {
		const bodyText = await req.text();
		form = new URLSearchParams(bodyText);
	} catch {
		return redirectTo('/checkout/cardnet/cancel');
	}

	const responseCode = form.get('ResponseCode') || '';
	if (!responseCode) {
		// Interim "Transaction Received" ack, not a result yet.
		return redirectTo('/checkout/cardnet/return');
	}

	const authorizationCode = form.get('AuthorizationCode');
	const retrievalRef = form.get('RetrievalReferenceNumber') || form.get('RetrivalReferenceNumber');
	const txToken = form.get('TxToken');

	const admin = createClient(supabaseUrl, serviceKey);
	const { data: order } = await admin
		.from('orders')
		.select('id, status, guest_lookup_token, cardnet_session_id')
		.eq('id', orderId)
		.maybeSingle();

	if (!order) return redirectTo('/checkout/cardnet/cancel');
	if (!order.cardnet_session_id) return redirectTo('/checkout/cardnet/cancel');

	// Guest orders carry their lookup token in the URL (same trust model as
	// cardnet-verify-session) — reject if it doesn't match. Logged-in orders
	// have no token to check here (CARDNET's browser POST can't carry a
	// Supabase JWT); order_id being an unguessable UUID is the same security
	// bar the rest of this checkout flow already relies on.
	if (order.guest_lookup_token && token !== order.guest_lookup_token) {
		console.error('cardnet-callback: guest token mismatch', { orderId });
		return redirectTo('/checkout/cardnet/cancel');
	}

	if (order.status === 'paid') {
		return redirectTo('/checkout-success'); // already finalized — idempotent
	}

	const approved = responseCode === '00';

	if (approved) {
		const { error: updErr } = await admin
			.from('orders')
			.update({
				status: 'paid',
				paid_at: new Date().toISOString(),
				payment_method: 'cardnet',
				cardnet_authorization_code: authorizationCode,
				cardnet_reference_number: retrievalRef,
				cardnet_tx_token: txToken,
				cardnet_response_code: responseCode,
				cardnet_response_message: 'Approved',
			})
			.eq('id', order.id);
		if (updErr) {
			console.error('cardnet-callback: order update failed', updErr);
			return redirectTo('/checkout/cardnet/cancel');
		}

		try {
			await fetch(`${supabaseUrl}/functions/v1/generate-order-invoice`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${relayToken}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({ order_id: order.id }),
			});
		} catch (e) {
			console.error('cardnet-callback: generate-order-invoice failed (non-fatal)', e);
		}

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
			console.error('cardnet-callback: send-order-email failed (non-fatal)', e);
		}

		return redirectTo('/checkout-success');
	}

	await admin
		.from('orders')
		.update({
			status: 'failed',
			cardnet_response_code: responseCode || null,
			cardnet_response_message: humanizeResponseCode(responseCode) || null,
			cardnet_tx_token: txToken,
		})
		.eq('id', order.id);

	return redirectTo('/checkout/cardnet/cancel', responseCode ? { code: responseCode } : {});
});
