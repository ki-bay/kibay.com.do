import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

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
		if (!stripeKey) {
			return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const stripe = new Stripe(stripeKey, {
			apiVersion: '2023-10-16',
			httpClient: Stripe.createFetchHttpClient(),
		});

		const { amount, currency = 'dop', metadata = {} } = await req.json();

		if (amount == null || Number.isNaN(Number(amount))) {
			return new Response(JSON.stringify({ error: 'Invalid amount' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// `amount` from the app is in major units (e.g. RD$); Stripe expects smallest currency unit.
		const unitAmount = Math.max(50, Math.round(Number(amount) * 100));

		const paymentIntent = await stripe.paymentIntents.create({
			amount: unitAmount,
			currency: String(currency).toLowerCase(),
			automatic_payment_methods: { enabled: true },
			metadata:
				typeof metadata === 'object' && metadata !== null
					? Object.fromEntries(
							Object.entries(metadata).map(([k, v]) => [k, String(v)]),
						)
					: {},
		});

		return new Response(JSON.stringify({ clientSecret: paymentIntent.client_secret }), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (e) {
		console.error(e);
		return new Response(JSON.stringify({ error: e.message ?? 'Stripe error' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
});
