import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});

const LEGACY_ADMIN_EMAIL = 'info@kibay.com.do';

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	if (req.method !== 'POST') {
		return json({ error: 'Method not allowed' }, 405);
	}

	try {
		const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
		const supabaseUrl = Deno.env.get('SUPABASE_URL');
		const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY');
		const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

		if (!stripeKey) {
			return json({ error: 'Missing STRIPE_SECRET_KEY' }, 500);
		}
		if (!supabaseUrl || !supabaseAnon || !serviceKey) {
			return json({ error: 'Missing Supabase env' }, 500);
		}

		// --- Auth: verify caller has a valid session via their JWT ---
		const authHeader = req.headers.get('Authorization');
		if (!authHeader) {
			return json({ error: 'Unauthorized' }, 401);
		}

		const userClient = createClient(supabaseUrl, supabaseAnon, {
			global: { headers: { Authorization: authHeader } },
		});
		const {
			data: { user },
			error: userErr,
		} = await userClient.auth.getUser();
		if (userErr || !user) {
			return json({ error: 'Unauthorized' }, 401);
		}

		// --- Authz: must be admin (role = 'admin' OR legacy email match) ---
		const admin = createClient(supabaseUrl, serviceKey);
		const { data: roleRow, error: roleErr } = await admin
			.from('users')
			.select('role,email')
			.eq('id', user.id)
			.single();

		const isAdmin =
			(!roleErr && roleRow?.role === 'admin') ||
			roleRow?.email === LEGACY_ADMIN_EMAIL ||
			user.email === LEGACY_ADMIN_EMAIL;

		if (!isAdmin) {
			return json({ error: 'Forbidden' }, 403);
		}

		// --- Parse body ---
		let body: { order_id?: string; amount?: number };
		try {
			body = await req.json();
		} catch {
			return json({ error: 'Invalid JSON body' }, 400);
		}

		const orderId = body?.order_id;
		if (!orderId || typeof orderId !== 'string') {
			return json({ error: 'order_id is required' }, 400);
		}

		let refundAmountCents: number | undefined;
		if (body.amount != null) {
			const n = Number(body.amount);
			if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
				return json({ error: 'amount must be a positive integer (cents)' }, 400);
			}
			refundAmountCents = n;
		}

		// --- Look up the order via service-role ---
		const { data: order, error: orderErr } = await admin
			.from('orders')
			.select('id,status,stripe_payment_intent_id,total_amount')
			.eq('id', orderId)
			.single();

		if (orderErr || !order) {
			return json({ error: 'Order not found' }, 404);
		}

		if (order.status !== 'paid') {
			return json({ error: "Order is not in 'paid' state" }, 400);
		}

		if (!order.stripe_payment_intent_id) {
			return json({ error: 'Order has no payment intent' }, 400);
		}

		if (refundAmountCents != null && refundAmountCents > Number(order.total_amount)) {
			return json({ error: 'Refund amount exceeds order total' }, 400);
		}

		// --- Issue the refund via Stripe ---
		const stripe = new Stripe(stripeKey, {
			apiVersion: '2023-10-16',
			httpClient: Stripe.createFetchHttpClient(),
		});

		const refundParams: Stripe.RefundCreateParams = {
			payment_intent: order.stripe_payment_intent_id,
		};
		if (refundAmountCents != null) {
			refundParams.amount = refundAmountCents;
		}

		const refund = await stripe.refunds.create(refundParams);

		// Don't update order status here — charge.refunded webhook owns that.
		return json({
			success: true,
			refund_id: refund.id,
			refund_amount: refund.amount,
			status: refund.status,
		});
	} catch (e) {
		console.error('refund-payment error:', e);
		const msg = (e as Error).message ?? 'Refund failed';
		return json({ error: msg }, 400);
	}
});
