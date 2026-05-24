// cardnet-auth-3ds
// =============================================================================
// Step 1 of the CARDNET ZTRANS direct payment flow.
//
// The SPA collects card data (PAN/CVV/expiry/holder) + browser context and
// POSTs it here. We hash it into a 3DS authentication request and call
//   POST {CARDNET_3DS_BASE_URL}/servicios/3ds/server/authentication
//
// CARDNET responds with either:
//   transStatus = "Y"  → frictionless auth, no challenge needed. SPA can
//                        immediately call cardnet-finalize-sale.
//   transStatus = "C"  → challenge required. We return browserChallengeUrl +
//                        browserChallengeToken. The SPA opens that URL in an
//                        iframe; the user completes the 3DS challenge with
//                        their bank; the iframe redirects back to our
//                        urlRedirect (/checkout/cardnet/return) which
//                        postMessages back to the parent. Parent then calls
//                        cardnet-finalize-sale.
//
// Card data discipline: we never log card-number / cvv, we never write them
// to the database. They live only in this function's memory for the
// duration of the HTTPS request, and on the SPA in React state.
//
// Required Edge Function secrets:
//   CARDNET_3DS_BASE_URL      sandbox: https://lab.cardnet.com.do
//                             prod:    https://servicios.cardnet.com.do
//   CARDNET_INTEGRATOR_CODE   sandbox: 349011300  (issued to merchant)
//   CARDNET_API_KEY           sandbox: 66827137-4ad5-4a37-8e87-6299fe2d5b57
//   CARDNET_RETURN_URL        e.g. https://kibay.com.do/checkout/cardnet/return

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const cardnet = {
	threeDsBaseUrl: Deno.env.get('CARDNET_3DS_BASE_URL') || '',
	integratorCode: Deno.env.get('CARDNET_INTEGRATOR_CODE') || '',
	apiKey: Deno.env.get('CARDNET_API_KEY') || '',
	returnUrl: Deno.env.get('CARDNET_RETURN_URL') || 'https://kibay.com.do/checkout/cardnet/return',
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

// Plain SHA-512 hex of UTF-8 bytes. CARDNET signs by hashing
// (integratorCode + cardExpiryDate + integratorTxId + purchaseAmount + apiKey).
// Verified against the example in the 3DS PDF page 1-2.
async function sha512Hex(msg: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(msg));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

function base64Encode(s: string): string {
	return btoa(s);
}

function isHexUuid(v: string | null | undefined): boolean {
	return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

type Body = {
	order_id?: string;
	token?: string; // guest_lookup_token for guest orders
	card?: {
		number?: string;       // PAN, digits only
		cvv?: string;          // 3 or 4 digits
		exp_month?: string;    // MM, "01"-"12"
		exp_year?: string;     // YY, two digits
		holder_name?: string;  // cardholder name
	};
	browser?: {
		screen_width?: number;
		screen_height?: number;
		javascript_enabled?: boolean;
		tz_offset_minutes?: number;
		user_agent?: string;
		language?: string;
		accept_header?: string;
		color_depth?: number;
	};
};

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

	const missing: string[] = [];
	if (!cardnet.threeDsBaseUrl) missing.push('CARDNET_3DS_BASE_URL');
	if (!cardnet.integratorCode) missing.push('CARDNET_INTEGRATOR_CODE');
	if (!cardnet.apiKey) missing.push('CARDNET_API_KEY');
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
		.select('id, user_id, total_amount, currency, status, guest_lookup_token')
		.eq('id', orderId)
		.single();
	if (orderErr || !order) return json({ error: 'Order not found' }, 404);

	const ownerMatches = order.user_id && userId && order.user_id === userId;
	const guestMatches = order.user_id === null && body.token && body.token === order.guest_lookup_token;
	if (!ownerMatches && !guestMatches) return json({ error: 'Unauthorized for this order' }, 403);
	if (order.status === 'paid') return json({ error: 'Order already paid' }, 409);

	// Build the /authentication request.
	const integratorTxId = crypto.randomUUID();
	// purchaseAmount is the minor-units amount as a string (e.g. "500" for
	// RD$5.00 with purchaseExponent=2). orders.total_amount is stored in
	// cents so we pass it through verbatim.
	const purchaseAmount = String(order.total_amount);
	// cardExpiryDate is YYMM (NOT MM/YY).
	const cardExpiryDate = `${expYear}${expMonth}`;
	// Signature = SHA-512(integratorCode + cardExpiryDate + integratorTxId + purchaseAmount + apiKey)
	const sigBase = cardnet.integratorCode + cardExpiryDate + integratorTxId + purchaseAmount + cardnet.apiKey;
	const signature = await sha512Hex(sigBase);

	const purchaseCurrency = order.currency === 'USD' ? '840' : '214';

	// Best-effort client IP from the load balancer's X-Forwarded-For.
	const fwd = req.headers.get('x-forwarded-for') || '';
	const clientIp = (fwd.split(',')[0] || '').trim() || '0.0.0.0';

	// purchaseDate: YYYYMMDDHHMMSS in UTC (CARDNET's example doesn't specify
	// TZ; UTC is the safest default).
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	const purchaseDate =
		`${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
		`${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;

	const browser = body.browser || {};
	// rd is a base64 of "UserId=<x>&IntegratorTxId=<uuid>" per the example.
	// We use orderId as UserId since that's what we'll need to correlate on
	// return.
	const rd = base64Encode(`UserId=${order.id}&IntegratorTxId=${integratorTxId}`);

	// Append order_id (and guest token) to the return URL so the iframe
	// redirect can correlate back to the order without state.
	const returnUrlWithOrder = (() => {
		const u = new URL(cardnet.returnUrl);
		u.searchParams.set('order_id', order.id);
		if (guestMatches) u.searchParams.set('token', String(order.guest_lookup_token));
		u.searchParams.set('tx', integratorTxId);
		return u.toString();
	})();

	const authPayload = {
		integratorCode: cardnet.integratorCode,
		integratorTxId,
		signature,
		urlRedirect: returnUrlWithOrder,
		rd,
		urlStatusCallback: null,
		purchaseAmount,
		acctNumber: cardNumber,
		cardExpiryDate,
		purchaseCurrency,
		browserScreenWidth: String(browser.screen_width ?? 1920),
		browserScreenHeight: String(browser.screen_height ?? 1080),
		browserJavascriptEnabled: browser.javascript_enabled ?? true,
		browserIP: clientIp,
		browserTZ: String(browser.tz_offset_minutes ?? 0),
		deviceChannel: '02', // browser-based
		browserUserAgent: browser.user_agent || 'Mozilla/5.0',
		purchaseDate,
		messageCategory: '01', // payment
		browserLanguage: browser.language || 'es',
		browserAcceptHeader: browser.accept_header || 'text/html,application/xhtml+xml',
		purchaseExponent: '2',
	};

	const authResp = await fetch(`${cardnet.threeDsBaseUrl}/servicios/3ds/server/authentication`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify(authPayload),
	});

	const authText = await authResp.text();
	console.log('CARDNET /authentication response', authResp.status, authResp.headers.get('content-type'), authText.slice(0, 800));
	let authBody: Record<string, unknown> = {};
	try {
		authBody = authText ? JSON.parse(authText) : {};
	} catch {
		// Non-JSON response. Return the raw text so the SPA can surface it.
		return json(
			{
				error: 'CARDNET returned non-JSON',
				status: authResp.status,
				content_type: authResp.headers.get('content-type'),
				body: authText.slice(0, 500),
			},
			502,
		);
	}

	if (!authResp.ok) {
		console.error('CARDNET /authentication failed', authResp.status, authBody);
		return json({ error: 'CARDNET authentication request failed', status: authResp.status, detail: authBody }, 502);
	}

	const transStatus = String(authBody.transStatus || '');
	const threeDSServerTransID = String(authBody.threeDSServerTransID || '');
	const browserChallengeUrl = authBody.browserChallengeUrl ? String(authBody.browserChallengeUrl) : null;
	const browserChallengeToken = authBody.browserChallengeToken ? String(authBody.browserChallengeToken) : null;

	if (!isHexUuid(threeDSServerTransID)) {
		return json(
			{
				error: 'CARDNET returned no threeDSServerTransID',
				detail: authBody,
				raw: authText.slice(0, 500),
			},
			502,
		);
	}

	// Persist the correlation fields on the order. We never persist card
	// data — only the 3DS bookkeeping needed to finalize the sale on return.
	await admin
		.from('orders')
		.update({
			payment_method: 'cardnet',
			cardnet_integrator_tx_id: integratorTxId,
			cardnet_three_ds_server_trans_id: threeDSServerTransID,
		})
		.eq('id', order.id);

	return json({
		transStatus,                  // "Y" frictionless | "C" challenge | "N" denied | "U"/"R" error
		threeDSServerTransID,
		integratorTxId,
		challengeUrl: browserChallengeUrl,
		challengeToken: browserChallengeToken,
		messageVersion: authBody.messageVersion || null,
	});
});
