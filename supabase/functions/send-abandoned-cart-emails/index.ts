// Sweeps for orders stuck in 'awaiting_payment' for > 30 min (and < 60 min,
// the cleanup window) and triggers a one-time recovery email via
// send-order-email with type='abandoned_cart'.
//
// Invoked by:
//   - pg_cron every 15 min (see migration 20260509210000_abandoned_cart_recovery.sql)
//   - manually:
//       curl -X POST \
//         -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
//         "$SUPABASE_URL/functions/v1/send-abandoned-cart-emails"
//
// Auth: service-role token only (server-to-server). No customer / admin user
// session is accepted — this is a backend job.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
// Dedicated cron token — decoupled from the auto-injected service-role
// key (which Supabase rotates independently). Set via:
//   supabase secrets set ABANDONED_CART_CRON_TOKEN=<hex>
const cronToken = Deno.env.get('ABANDONED_CART_CRON_TOKEN') || '';

serve(async (req) => {
	if (req.method !== 'POST') {
		return json({ error: 'Method not allowed' }, 405);
	}
	if (!supabaseUrl || !serviceKey) {
		return json({ error: 'Missing configuration' }, 500);
	}

	// Only the cron token (or service-role token, for manual admin
	// invocations) can run this. The cron job uses ABANDONED_CART_CRON_TOKEN.
	const auth = req.headers.get('authorization') || '';
	const token = auth.replace(/^Bearer\s+/i, '');
	if (token !== serviceKey && (!cronToken || token !== cronToken)) {
		return json({ error: 'Unauthorized' }, 401);
	}

	const admin = createClient(supabaseUrl, serviceKey);

	// Find orders awaiting_payment for > 30 min, < 60 min (so we don't email
	// ones that are about to be auto-canceled), where we haven't emailed yet.
	const now = Date.now();
	const cutoffNew = new Date(now - 30 * 60 * 1000).toISOString(); // older than this
	const cutoffOld = new Date(now - 60 * 60 * 1000).toISOString(); // newer than this

	const { data: orders, error } = await admin
		.from('orders')
		.select('id, shipping_address')
		.eq('status', 'awaiting_payment')
		.is('recovery_email_sent_at', null)
		.gt('created_at', cutoffOld) // not too old (cron-cleanup will get those)
		.lt('created_at', cutoffNew); // older than 30 min
	if (error) {
		console.error('Abandoned-cart query failed:', error);
		return json({ error: error.message }, 500);
	}

	let sent = 0;
	let skipped = 0;
	for (const order of orders || []) {
		const shipping = (order as { shipping_address?: { email?: string } }).shipping_address;
		if (!shipping?.email) {
			skipped++;
			continue;
		}

		// Mark BEFORE sending so we don't double-send on retries.
		// The `.is('recovery_email_sent_at', null)` filter is a race guard — if
		// another invocation already marked it, the update affects 0 rows and
		// we skip.
		const { data: marked, error: markErr } = await admin
			.from('orders')
			.update({ recovery_email_sent_at: new Date().toISOString() })
			.eq('id', (order as { id: string }).id)
			.is('recovery_email_sent_at', null)
			.select('id');
		if (markErr) {
			console.error('Mark failed for order', (order as { id: string }).id, markErr);
			continue;
		}
		if (!marked || marked.length === 0) {
			// Lost the race — another worker is handling it.
			skipped++;
			continue;
		}

		// Invoke send-order-email with the new type.
		try {
			const resp = await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${serviceKey}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ order_id: (order as { id: string }).id, type: 'abandoned_cart' }),
			});
			if (resp.ok) {
				sent++;
			} else {
				const text = await resp.text();
				console.error(
					`send-order-email (abandoned_cart) failed for ${(order as { id: string }).id}`,
					resp.status,
					text,
				);
			}
		} catch (e) {
			console.error(
				`send-order-email (abandoned_cart) threw for ${(order as { id: string }).id}`,
				e,
			);
		}
	}

	return json({ checked: orders?.length || 0, sent, skipped });
});

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
