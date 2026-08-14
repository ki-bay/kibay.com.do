// alert-stuck-orders
// =============================================================================
// Hourly sweep that emails the admin when any order has been stuck in
// `awaiting_payment` for > 1 hour. That state means the customer initiated
// checkout but cardnet-verify-session never confirmed a result — typically
// caused by:
//   - CardNet's hosted session expiring/failing before the buyer completed
//     payment (check the order's cardnet_response_code/message once set)
//   - Customer abandoned during the CardNet page / 3DS challenge (low-risk,
//     gets cleaned up by the cancel_stale_awaiting_payment_orders_hourly job
//     within ~1h)
//   - A CardNet-side outage or sandbox issue
// We email so the owner can spot-check rather than discovering 24h later
// that yesterday's three "orders" never actually paid.
//
// Auth: dedicated ADMIN_ALERT_CRON_TOKEN (same pattern as abandoned-cart).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cronToken = Deno.env.get('ADMIN_ALERT_CRON_TOKEN') || '';
const brevoApiKey = Deno.env.get('BREVO_API_KEY')!;
const fromEmail = Deno.env.get('REVIEW_EMAIL_FROM') || 'Kibay <info@kibay.com.do>';
const adminEmail = Deno.env.get('ADMIN_NOTIFY_EMAIL') || 'info@kibay.com.do';

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

serve(async (req) => {
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
	if (!supabaseUrl || !serviceKey) return json({ error: 'Missing config' }, 500);

	const auth = req.headers.get('authorization') || '';
	const token = auth.replace(/^Bearer\s+/i, '');
	if (token !== serviceKey && (!cronToken || token !== cronToken)) {
		return json({ error: 'Unauthorized' }, 401);
	}

	const admin = createClient(supabaseUrl, serviceKey);

	// Stuck = awaiting_payment AND older than 60 min. We don't alert on
	// older-than-3h because cancel_stale_awaiting_payment_orders_hourly
	// will purge those automatically.
	const cutoffOlder = new Date(Date.now() - 60 * 60 * 1000).toISOString();
	const cutoffYounger = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

	const { data: stuck, error } = await admin
		.from('orders')
		.select('id, order_number, total_amount, currency, created_at, shipping_address')
		.eq('status', 'awaiting_payment')
		.lt('created_at', cutoffOlder)
		.gt('created_at', cutoffYounger)
		.order('created_at', { ascending: true });

	if (error) {
		return json({ error: 'Query failed', detail: error.message }, 500);
	}

	if (!stuck || stuck.length === 0) {
		return json({ stuck: 0, alerted: false });
	}

	// Build a single digest email instead of one per order.
	const rows = stuck
		.map((o) => {
			const minsOld = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
			const name = `${o.shipping_address?.firstName || ''} ${o.shipping_address?.lastName || ''}`.trim() || '—';
			const email = o.shipping_address?.email || '—';
			return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px;">${o.order_number}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${name}<br/><span style="color:#888;font-size:11px;">${email}</span></td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${o.total_amount} ${o.currency}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:#c2410c;">${minsOld} min</td>
      </tr>`;
		})
		.join('');

	const html = `<!doctype html>
<html><body style="margin:0;padding:24px;font-family:-apple-system,Helvetica,Arial,sans-serif;background:#f5f5f4;color:#1c1917;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e7e5e4;border-radius:8px;">
    <tr><td style="padding:20px 24px;border-bottom:1px solid #e7e5e4;">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#c2410c;">⚠ Kibay alert</div>
      <h1 style="margin:4px 0 0 0;font-size:18px;font-weight:600;">${stuck.length} order${stuck.length === 1 ? '' : 's'} stuck in awaiting_payment</h1>
      <p style="margin:6px 0 0 0;font-size:13px;color:#78716c;">These orders never got a confirmed result back from CARDNET within an hour of creation. Investigate before they auto-cancel.</p>
    </td></tr>
    <tr><td style="padding:16px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;font-size:13px;">
        <thead><tr style="background:#f5f5f4;">
          <th style="padding:8px 12px;text-align:left;color:#78716c;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Order</th>
          <th style="padding:8px 12px;text-align:left;color:#78716c;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Customer</th>
          <th style="padding:8px 12px;text-align:right;color:#78716c;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Amount</th>
          <th style="padding:8px 12px;text-align:right;color:#78716c;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Age</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </td></tr>
    <tr><td style="padding:16px 24px;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c;">
      <p style="margin:0 0 8px 0;"><strong>What to check:</strong></p>
      <ol style="margin:0;padding-left:20px;">
        <li>Check the order's <code>cardnet_response_code</code> / <code>cardnet_response_message</code> in admin orders — if set, CARDNET already told us why (declined, session expired, etc.).</li>
        <li>If those are still empty, the buyer likely never finished CARDNET's hosted page (didn't complete 3DS, or closed the tab) — will auto-cancel within 2h.</li>
        <li>If you suspect a real CARDNET-side issue, check with Hansel/Integraciones CARDNET directly — this is not a Stripe integration.</li>
      </ol>
      <p style="margin:12px 0 0 0;"><a href="https://kibay.com.do/admin/orders" style="color:#1c1917;">→ Open admin orders</a></p>
    </td></tr>
  </table>
</body></html>`;

	const brevoResp = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: {
			'api-key': brevoApiKey,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			sender: parseFrom(fromEmail),
			to: [{ email: adminEmail, name: 'Kibay Admin' }],
			subject: `⚠ Kibay: ${stuck.length} stuck order${stuck.length === 1 ? '' : 's'} need attention`,
			htmlContent: html,
		}),
	});

	if (!brevoResp.ok) {
		const detail = await brevoResp.text();
		console.error('alert-stuck-orders: Brevo send failed', brevoResp.status, detail);
		return json({ stuck: stuck.length, alerted: false, error: detail }, 500);
	}

	return json({ stuck: stuck.length, alerted: true });
});

function parseFrom(s: string): { name?: string; email: string } {
	// "Kibay <info@kibay.com.do>" → { name: 'Kibay', email: 'info@kibay.com.do' }
	const m = s.match(/^\s*(.+?)\s*<([^>]+)>\s*$/);
	if (m) return { name: m[1], email: m[2] };
	return { email: s.trim() };
}
