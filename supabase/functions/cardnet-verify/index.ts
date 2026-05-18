// cardnet-verify
// =============================================================================
// Called by /checkout/cardnet/return after CARDNET redirects the customer
// back. Queries CARDNET for the final transaction status and, if approved,
// marks the order paid (mirrors the path stripe-webhook takes for Stripe).
//
// CARDNET sends the result via URL params on the return; we still re-query
// server-side so the SPA can never spoof a "paid" state.
//
// Auth: same as create-cardnet-session — user must own the order, or admin.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const cardnet = {
	baseUrl: Deno.env.get('CARDNET_BASE_URL') || '',
	merchantNumber: Deno.env.get('CARDNET_MERCHANT_NUMBER') || '',
	terminal: Deno.env.get('CARDNET_TERMINAL') || '',
	encryptionKey: Deno.env.get('CARDNET_ENCRYPTION_KEY') || '',
	keyId: Deno.env.get('CARDNET_KEY_ID') || '',
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

	if (!cardnet.baseUrl || !cardnet.encryptionKey) {
		return json({ error: 'CARDNET not configured' }, 503);
	}

	// Dual auth: authenticated owner OR anon guest with the order's
	// guest_lookup_token. Mirrors create-cardnet-session.
	const { order_id, token: guestToken } = (await req.json()) as {
		order_id?: string;
		token?: string;
	};
	if (!order_id) return json({ error: 'order_id required' }, 400);

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
		.select('id, user_id, status, cardnet_session_id, order_number, total_amount, currency, guest_lookup_token')
		.eq('id', order_id)
		.single();
	if (orderErr || !order) return json({ error: 'Order not found' }, 404);

	const ownerMatches = order.user_id && userId && order.user_id === userId;
	const guestMatches = order.user_id === null && guestToken && guestToken === order.guest_lookup_token;
	if (!ownerMatches && !guestMatches) {
		return json({ error: 'Unauthorized for this order' }, 403);
	}
	if (!order.cardnet_session_id) return json({ error: 'No CARDNET session on order' }, 400);

	// Already paid? short-circuit — repeat /verify calls are safe.
	if (order.status === 'paid') return json({ status: 'paid', order_id: order.id });

	// Query CARDNET for the session result.
	const resp = await fetch(
		`${cardnet.baseUrl}/Checkouts/${encodeURIComponent(order.cardnet_session_id)}`,
		{
			method: 'GET',
			headers: { Accept: 'application/json' },
		},
	);
	const result = (await resp.json()) as {
		ResponseCode?: string;
		ResponseMessage?: string;
		AuthorizationCode?: string;
		RetrievalReferenceNumber?: string;
		Amount?: string;
		errorMessage?: string;
	};

	if (!resp.ok) {
		return json({ error: 'CARDNET verify failed', detail: result }, 502);
	}

	// '00' is the standard ISO 8583 approved code. CARDNET sometimes uses
	// '000' so accept either.
	const approved = result.ResponseCode === '00' || result.ResponseCode === '000';

	if (!approved) {
		await admin
			.from('orders')
			.update({
				status: 'payment_failed',
				cardnet_response_code: result.ResponseCode || null,
				cardnet_response_message: result.ResponseMessage || result.errorMessage || null,
			})
			.eq('id', order.id);
		return json({ status: 'failed', code: result.ResponseCode, message: result.ResponseMessage });
	}

	// Verify CARDNET's reported amount matches what we recorded (anti-tamper).
	const expectedCents = Math.round(order.total_amount * 100);
	const reportedCents = Number(result.Amount || 0);
	if (reportedCents && Math.abs(reportedCents - expectedCents) > 1) {
		console.error(`CARDNET amount mismatch — expected ${expectedCents}, got ${reportedCents}`);
		return json({ error: 'Amount mismatch — possible tampering' }, 409);
	}

	// Mark paid. The same inventory-decrement trigger that fires on Stripe
	// success will also fire here (it watches `status` transitions to 'paid').
	const { error: updErr } = await admin
		.from('orders')
		.update({
			status: 'paid',
			paid_at: new Date().toISOString(),
			cardnet_authorization_code: result.AuthorizationCode || null,
			cardnet_reference_number: result.RetrievalReferenceNumber || null,
			payment_method: 'cardnet',
		})
		.eq('id', order.id);
	if (updErr) return json({ error: 'Order update failed', detail: updErr.message }, 500);

	// Fire the confirmation email (same Edge Function Stripe webhook uses).
	try {
		await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${serviceKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ order_id: order.id, type: 'confirmation' }),
		});
		await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${serviceKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ order_id: order.id, type: 'admin_new_order' }),
		});
	} catch (e) {
		console.error('send-order-email after CARDNET paid failed (non-fatal):', e);
	}

	return json({ status: 'paid', order_id: order.id });
});
