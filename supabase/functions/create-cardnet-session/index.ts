// create-cardnet-session
// =============================================================================
// Initiates a CARDNET hosted "Botón de Pago" session for a Kibay order. The
// SPA POSTs `{ order_id }` here; we look up the order, sign a session
// request against CARDNET's REST API, and return the redirect URL. The
// customer is sent to CARDNET's hosted page, enters card data there (zero
// PCI scope on us), and is returned to /checkout/cardnet/return with a
// session id we then verify via cardnet-verify.
//
// Required Edge Function secrets (set via `supabase secrets set`):
//   CARDNET_BASE_URL          e.g. https://ecommerce.cardnet.com.do/api/payment
//                             (sandbox: https://labservicios.cardnet.com.do/api/payment)
//   CARDNET_MERCHANT_NUMBER   issued by CARDNET (9-digit)
//   CARDNET_TERMINAL          issued by CARDNET (8-char)
//   CARDNET_MERCHANT_TYPE     MCC, e.g. 5921 for wine/liquor
//   CARDNET_MERCHANT_NAME     name shown on CARDNET hosted page
//   CARDNET_ENCRYPTION_KEY    HMAC signing key
//   CARDNET_KEY_ID            key version identifier (issued with the key)
//   CARDNET_RETURN_URL        e.g. https://kibay.com.do/checkout/cardnet/return
//   CARDNET_CANCEL_URL        e.g. https://kibay.com.do/checkout/cardnet/cancel
//
// Auth: the SPA calls this with the user's Supabase access token. The
// function verifies the user owns the order before proceeding.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const cardnet = {
	baseUrl: Deno.env.get('CARDNET_BASE_URL') || '',
	merchantNumber: Deno.env.get('CARDNET_MERCHANT_NUMBER') || '',
	terminal: Deno.env.get('CARDNET_TERMINAL') || '',
	merchantType: Deno.env.get('CARDNET_MERCHANT_TYPE') || '5921',
	merchantName: Deno.env.get('CARDNET_MERCHANT_NAME') || 'Kibay',
	encryptionKey: Deno.env.get('CARDNET_ENCRYPTION_KEY') || '',
	keyId: Deno.env.get('CARDNET_KEY_ID') || '',
	returnUrl: Deno.env.get('CARDNET_RETURN_URL') || 'https://kibay.com.do/checkout/cardnet/return',
	cancelUrl: Deno.env.get('CARDNET_CANCEL_URL') || 'https://kibay.com.do/checkout/cardnet/cancel',
};

const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
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

	// 0. Configuration sanity check — fail fast with the missing var names.
	const missing: string[] = [];
	if (!cardnet.baseUrl) missing.push('CARDNET_BASE_URL');
	if (!cardnet.merchantNumber) missing.push('CARDNET_MERCHANT_NUMBER');
	if (!cardnet.terminal) missing.push('CARDNET_TERMINAL');
	if (!cardnet.encryptionKey) missing.push('CARDNET_ENCRYPTION_KEY');
	if (!cardnet.keyId) missing.push('CARDNET_KEY_ID');
	if (missing.length) {
		return json(
			{ error: 'CARDNET not configured', missing },
			503,
		);
	}

	// 1. Auth — either authenticated owner OR an anonymous guest who can
	//    prove possession of the order's guest_lookup_token. Same dual-path
	//    the SPA's checkout flow uses for both Stripe and CARDNET.
	const body = (await req.json()) as { order_id?: string; token?: string };
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
	const { data: order, error: orderErr } = await admin
		.from('orders')
		.select('id, order_number, user_id, total_amount, currency, status, guest_lookup_token')
		.eq('id', orderId)
		.single();
	if (orderErr || !order) return json({ error: 'Order not found' }, 404);

	const ownerMatches = order.user_id && userId && order.user_id === userId;
	const guestMatches = order.user_id === null && body.token && body.token === order.guest_lookup_token;
	if (!ownerMatches && !guestMatches) {
		return json({ error: 'Unauthorized for this order' }, 403);
	}
	if (order.status === 'paid') return json({ error: 'Order already paid' }, 409);

	// 3. Build the CARDNET checkout-creation request. Field names follow
	// CARDNET's REST "con pantalla" (POST + 3DS) spec at
	// https://developers.cardnet.com.do/guias/boton-de-pago/web-con-pantalla-post-3ds.html
	// Currency code: 214 = DOP, 840 = USD (ISO 4217 numeric).
	const currencyCode = order.currency === 'USD' ? '840' : '214';
	// CARDNET wants amount in cents as a string (no decimals, left-padded).
	const amountInCents = String(Math.round(order.total_amount * 100));

	const payload = {
		TransactionType: '0200', // sale
		CurrencyCode: currencyCode,
		Amount: amountInCents,
		Tax: '000000000000',
		MerchantNumber: cardnet.merchantNumber,
		MerchantTerminal: cardnet.terminal,
		MerchantType: cardnet.merchantType,
		MerchantName: cardnet.merchantName,
		OrderNumber: order.order_number || order.id.slice(0, 18),
		ReturnUrl: `${cardnet.returnUrl}?order_id=${order.id}${guestMatches ? `&token=${order.guest_lookup_token}` : ''}`,
		CancelUrl: cardnet.cancelUrl,
		KeyId: cardnet.keyId,
		AcquiringInstitutionCode: '349', // standard for DR acquiring
	};

	// 4. Sign the payload. CARDNET uses HMAC-SHA512 of a concatenated string
	// in field-name order. The exact signing recipe is on the developer
	// portal under "Firmas digitales" — when you have the live key in hand,
	// double-check the field order matches what your account exec confirms
	// (it can differ slightly per merchant configuration).
	const signatureBase = [
		payload.TransactionType,
		payload.CurrencyCode,
		payload.Amount,
		payload.Tax,
		payload.MerchantNumber,
		payload.MerchantTerminal,
		payload.OrderNumber,
		payload.KeyId,
	].join('');
	const sig = await hmacSha512Hex(cardnet.encryptionKey, signatureBase);

	// 5. Call CARDNET to mint a session.
	const cardnetResp = await fetch(`${cardnet.baseUrl}/Checkouts`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({ ...payload, Signature: sig }),
	});

	const cardnetBody = (await cardnetResp.json()) as {
		SESSION?: string;
		Session?: string;
		ResponseCode?: string;
		ResponseMessage?: string;
		errorMessage?: string;
	};

	if (!cardnetResp.ok || !(cardnetBody.SESSION || cardnetBody.Session)) {
		console.error('CARDNET session create failed', cardnetResp.status, cardnetBody);
		return json(
			{
				error: 'CARDNET session create failed',
				status: cardnetResp.status,
				detail: cardnetBody,
			},
			502,
		);
	}

	const session = cardnetBody.SESSION || cardnetBody.Session;

	// 6. Persist the session id on the order so we can verify the return.
	await admin
		.from('orders')
		.update({
			cardnet_session_id: session,
			payment_method: 'cardnet',
		})
		.eq('id', order.id);

	// 7. Return the redirect URL to the SPA. CARDNET's hosted form lives at
	// the merchant-side base (NOT the API base). Per the docs:
	//   https://ecommerce.cardnet.com.do/Authentication/Index?SESSION=...
	const hostBase = cardnet.baseUrl
		.replace('/api/payment', '')
		.replace('labservicios.cardnet.com.do', 'ecommerce.cardnet.com.do');
	const redirectUrl = `${hostBase}/Authentication/Index?SESSION=${session}`;

	return json({ redirect_url: redirectUrl, session });
});

async function hmacSha512Hex(key: string, msg: string): Promise<string> {
	const enc = new TextEncoder();
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		enc.encode(key),
		{ name: 'HMAC', hash: 'SHA-512' },
		false,
		['sign'],
	);
	const buf = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}
