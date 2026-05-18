import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	try {
		const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
		const supabaseUrl = Deno.env.get('SUPABASE_URL');
		const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY');
		const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

		if (!stripeKey) {
			return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		if (!supabaseUrl || !supabaseAnon) {
			return new Response(JSON.stringify({ error: 'Missing Supabase env' }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// Guest checkout: an authenticated user is preferred (when present we
		// stamp supabase_user_id on the PaymentIntent metadata), but not
		// required. The anti-spoof guarantee comes from the (order_id,
		// total_amount) match below — a stranger would need to guess a fresh
		// UUIDv4 to commandeer a paying order's intent.
		const authHeader = req.headers.get('Authorization');
		let user: { id: string } | null = null;
		if (authHeader) {
			const userClient = createClient(supabaseUrl, supabaseAnon, {
				global: { headers: { Authorization: authHeader } },
			});
			const { data } = await userClient.auth.getUser();
			user = data?.user ? { id: data.user.id } : null;
		}

		const body = await req.json();
		const { amount, currency = 'dop', metadata = {}, order_id: orderId } = body;

		if (amount == null || Number.isNaN(Number(amount))) {
			return new Response(JSON.stringify({ error: 'Invalid amount' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const unitAmount = Math.max(50, Math.round(Number(amount) * 100));

		let orderMetadata: Record<string, string> = {};
		let stripeReceiptEmail: string | undefined;
		if (orderId) {
			if (!serviceKey) {
				return new Response(JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY for order-bound payments' }), {
					status: 500,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
			const admin = createClient(supabaseUrl, serviceKey);
			const { data: order, error: orderErr } = await admin
				.from('orders')
				.select('id,user_id,status,total_amount,shipping_address')
				.eq('id', orderId)
				.single();

			if (orderErr || !order) {
				return new Response(JSON.stringify({ error: 'Invalid order' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
			// If the order is owned (registered customer), require that owner.
			// Guest orders (user_id NULL) skip ownership — order_id is a UUIDv4
			// and the amount must match below, which is the anti-spoof.
			if (order.user_id !== null && order.user_id !== user?.id) {
				return new Response(JSON.stringify({ error: 'Order belongs to another user' }), {
					status: 403,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
			if (order.status !== 'awaiting_payment') {
				return new Response(JSON.stringify({ error: 'Order is not awaiting payment' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
			if (Number(order.total_amount) !== unitAmount) {
				return new Response(JSON.stringify({ error: 'Amount does not match order total' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
			orderMetadata = {
				order_id: String(order.id),
				...(user ? { supabase_user_id: user.id } : { guest: 'true' }),
			};
			// Stripe sends its own receipt email (separate from our Brevo
			// confirmation) when receipt_email is set on the PaymentIntent.
			// Useful for guests who otherwise might miss our email — Stripe's
			// inbox-delivery is very reliable.
			const orderEmail =
				typeof order.shipping_address === 'object' && order.shipping_address
					? (order.shipping_address as { email?: string }).email
					: undefined;
			if (orderEmail) {
				stripeReceiptEmail = orderEmail;
			}
		}

		const stripe = new Stripe(stripeKey, {
			apiVersion: '2023-10-16',
			httpClient: Stripe.createFetchHttpClient(),
		});

		const flatMeta =
			typeof metadata === 'object' && metadata !== null
				? Object.fromEntries(Object.entries(metadata).map(([k, v]) => [k, String(v)]))
				: {};

		const paymentIntent = await stripe.paymentIntents.create({
			amount: unitAmount,
			currency: String(currency).toLowerCase(),
			automatic_payment_methods: { enabled: true },
			metadata: { ...flatMeta, ...orderMetadata },
			...(stripeReceiptEmail ? { receipt_email: stripeReceiptEmail } : {}),
		});

		// Stamp the PaymentIntent ID back on the order so the webhook can
		// match. Logged-in users can do this from the SPA via RLS; guests
		// can't (anon has no UPDATE on orders), so we always do it here
		// with the service role when we have an order id.
		if (orderId && serviceKey) {
			const admin = createClient(supabaseUrl, serviceKey);
			await admin
				.from('orders')
				.update({ stripe_payment_intent_id: paymentIntent.id })
				.eq('id', orderId);
		}

		return new Response(
			JSON.stringify({
				clientSecret: paymentIntent.client_secret,
				paymentIntentId: paymentIntent.id,
			}),
			{
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			},
		);
	} catch (e) {
		console.error(e);
		return new Response(JSON.stringify({ error: (e as Error).message ?? 'Stripe error' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
});
