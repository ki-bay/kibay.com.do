// Sends transactional order emails via Brevo (formerly Sendinblue).
//
// Caller may be:
//   - An Edge Function with the service-role key in the Authorization header
//     (used by stripe-webhook on payment_intent.succeeded / charge.refunded).
//   - An admin user calling from the dashboard (Resend confirmation /
//     Send tracking buttons in AdminOrdersPage).
//
// Body: { order_id: uuid, type: 'confirmation' | 'tracking' | 'refund' }
//
// Required Supabase secrets:
//   BREVO_API_KEY        — from app.brevo.com/settings/keys/api
//   ORDER_EMAIL_FROM     — must be a Brevo-verified sender. Format:
//                          "Kibay <orders@kibay.com.do>" or just an address.
//                          Brevo requires sender verification; verify a single
//                          email at app.brevo.com/senders/list (fast) or your
//                          full domain via DNS for production.
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY (auto-injected)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const brevoKey = Deno.env.get('BREVO_API_KEY');
const fromAddress = Deno.env.get('ORDER_EMAIL_FROM') || '';
// Optional admin notification BCC. When set, the admin receives a copy of every
// customer 'confirmation' and 'refund' email. Default: 'info@kibay.com.do'.
// Set to an empty string in Supabase secrets to disable.
const adminNotifyEmail =
	Deno.env.get('ADMIN_NOTIFY_EMAIL') ?? 'info@kibay.com.do';

// Parse "Name <email>" format into Brevo's sender shape.
function parseFrom(s: string): { name?: string; email: string } | null {
	const trimmed = (s || '').trim();
	if (!trimmed) return null;
	const m = trimmed.match(/^(.*?)<\s*([^>]+)\s*>\s*$/);
	if (m) {
		const name = m[1].trim().replace(/^"(.*)"$/, '$1');
		return { name: name || undefined, email: m[2].trim() };
	}
	if (trimmed.includes('@')) return { email: trimmed };
	return null;
}

const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

	if (!brevoKey) {
		console.error('BREVO_API_KEY not set');
		return json({ error: 'Email provider not configured' }, 500);
	}
	const sender = parseFrom(fromAddress);
	if (!sender) {
		console.error('ORDER_EMAIL_FROM not set or invalid');
		return json({ error: 'Sender address not configured' }, 500);
	}

	const auth = req.headers.get('authorization') || '';
	const token = auth.replace(/^Bearer\s+/i, '');
	if (!token) return json({ error: 'Missing authorization' }, 401);

	// Either the caller is service-role (server-to-server), or an admin user.
	const isServiceRole = token === serviceKey;
	if (!isServiceRole) {
		const userClient = createClient(supabaseUrl, anonKey, {
			global: { headers: { Authorization: `Bearer ${token}` } },
		});
		const { data: userData, error: userErr } = await userClient.auth.getUser();
		if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401);

		const admin = createClient(supabaseUrl, serviceKey);
		const { data: profile } = await admin
			.from('users')
			.select('role,email')
			.eq('id', userData.user.id)
			.maybeSingle();
		const isAdmin =
			profile?.role === 'admin' ||
			profile?.email === 'info@kibay.com.do' ||
			userData.user.email === 'info@kibay.com.do';
		if (!isAdmin) return json({ error: 'Admin only' }, 403);
	}

	let body: { order_id?: string; type?: string };
	try {
		body = await req.json();
	} catch {
		return json({ error: 'Invalid JSON' }, 400);
	}
	const { order_id, type } = body;
	if (!order_id) return json({ error: 'order_id required' }, 400);
	if (type !== 'confirmation' && type !== 'tracking' && type !== 'refund') {
		return json({ error: "type must be 'confirmation' | 'tracking' | 'refund'" }, 400);
	}

	const admin = createClient(supabaseUrl, serviceKey);
	const { data: order, error: orderErr } = await admin
		.from('orders')
		.select('*')
		.eq('id', order_id)
		.single();
	if (orderErr || !order) return json({ error: 'Order not found' }, 404);

	const { data: items } = await admin
		.from('order_items')
		.select('*')
		.eq('order_id', order_id);

	const ship = order.shipping_address || {};
	const to = ship.email;
	if (!to) return json({ error: 'Order has no shipping email' }, 400);

	const lang: 'es' | 'en' = order.currency === 'USD' ? 'en' : 'es';
	const { subject, html } = renderEmail(type, order, items || [], lang);

	const recipientName =
		`${ship.firstName || ''} ${ship.lastName || ''}`.trim() || undefined;

	// BCC the admin on customer confirmation + refund emails so the owner
	// gets a copy of every transactional message. Skip BCC for tracking
	// (admin clicked the button themselves) and when admin equals the
	// customer (avoid Brevo rejecting "same address in TO and BCC").
	const wantsBcc =
		!!adminNotifyEmail &&
		(type === 'confirmation' || type === 'refund') &&
		adminNotifyEmail.toLowerCase() !== String(to).toLowerCase();

	const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: {
			'api-key': brevoKey,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({
			sender,
			to: [{ email: to, ...(recipientName ? { name: recipientName } : {}) }],
			...(wantsBcc ? { bcc: [{ email: adminNotifyEmail, name: 'Kibay Admin' }] } : {}),
			subject,
			htmlContent: html,
		}),
	});
	if (!resp.ok) {
		const errText = await resp.text();
		console.error('Brevo send failed', resp.status, errText);
		return json({ error: 'Send failed', details: errText }, 502);
	}
	const sent = await resp.json();
	return json({ success: true, id: sent.messageId });
});

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...cors, 'Content-Type': 'application/json' },
	});
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

type Order = Record<string, unknown> & {
	order_number: string;
	total_amount: number;
	subtotal_amount?: number;
	shipping_amount?: number;
	currency: 'USD' | 'DOP';
	tracking_number?: string;
	shipping_method?: string;
	shipping_address: Record<string, string>;
	estimated_delivery_date?: string;
	invoice_pdf_path?: string;
};
type Item = Record<string, unknown> & {
	product_name: string;
	quantity: number;
	price_per_item: number;
	total_price: number;
};

const T = {
	confirmation: {
		es: {
			subject: (o: Order) => `Pedido confirmado — ${o.order_number}`,
			heading: '¡Gracias por tu pedido!',
			intro: 'Recibimos tu pago y estamos preparando tu pedido. Te avisaremos cuando se envíe.',
			itemsLabel: 'Productos',
			subtotalLabel: 'Subtotal',
			shippingLabel: 'Envío',
			totalLabel: 'Total',
			shipToLabel: 'Envío a',
			outro: 'Si tienes alguna pregunta, responde a este correo.',
		},
		en: {
			subject: (o: Order) => `Order confirmed — ${o.order_number}`,
			heading: 'Thanks for your order!',
			intro: "We've received your payment and we're preparing your order. We'll let you know when it ships.",
			itemsLabel: 'Items',
			subtotalLabel: 'Subtotal',
			shippingLabel: 'Shipping',
			totalLabel: 'Total',
			shipToLabel: 'Ship to',
			outro: "If you have any questions, just reply to this email.",
		},
	},
	tracking: {
		es: {
			subject: (o: Order) => `Tu pedido va en camino — ${o.order_number}`,
			heading: 'Tu pedido está en camino',
			intro: 'Acabamos de enviar tu pedido. Aquí tienes los detalles para seguirlo.',
			trackingLabel: 'Número de rastreo',
			methodLabel: 'Método',
			outro: 'Te llegará pronto. ¡Gracias por elegir Kibay!',
		},
		en: {
			subject: (o: Order) => `Your order is on its way — ${o.order_number}`,
			heading: 'Your order is on its way',
			intro: "We just shipped your order. Here are the details to track it.",
			trackingLabel: 'Tracking number',
			methodLabel: 'Method',
			outro: "You'll have it soon. Thanks for choosing Kibay!",
		},
	},
	refund: {
		es: {
			subject: (o: Order) => `Reembolso procesado — ${o.order_number}`,
			heading: 'Reembolso procesado',
			intro: 'Hemos procesado el reembolso de tu pedido. El monto debería aparecer en tu cuenta en 5–10 días hábiles según tu banco.',
			outro: 'Si tienes alguna pregunta, responde a este correo.',
		},
		en: {
			subject: (o: Order) => `Refund processed — ${o.order_number}`,
			heading: 'Refund processed',
			intro: "We've processed the refund for your order. It should appear on your account within 5–10 business days depending on your bank.",
			outro: 'If you have any questions, just reply to this email.',
		},
	},
};

function renderEmail(
	type: 'confirmation' | 'tracking' | 'refund',
	order: Order,
	items: Item[],
	lang: 'es' | 'en',
): { subject: string; html: string } {
	const tpl = T[type][lang];
	const subject = tpl.subject(order);
	const symbol = order.currency === 'USD' ? '$' : 'RD$';
	const fmt = (cents: number) => `${symbol}${(Number(cents) / 100).toFixed(2)}`;
	const ship = order.shipping_address || {};
	const customerName = `${ship.firstName || ''} ${ship.lastName || ''}`.trim() || ship.email || '';

	const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1917;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafaf9;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <tr><td style="background:#FF7500;padding:24px 32px;color:#ffffff;font-size:22px;font-weight:600;letter-spacing:0.02em;">KIBAY</td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:600;color:#1c1917;">${escapeHtml(tpl.heading)}</h1>
          <p style="margin:0 0 24px 0;font-size:15px;line-height:1.55;color:#44403c;">${escapeHtml(tpl.intro)}</p>
          <p style="margin:0 0 24px 0;font-size:14px;color:#78716c;">${lang === 'es' ? 'Pedido' : 'Order'}: <strong style="color:#1c1917;">${escapeHtml(order.order_number)}</strong></p>

          ${type === 'confirmation' ? renderItemsTable(items, fmt, tpl as Record<string, string>, order, symbol) : ''}

          ${type === 'tracking' ? renderTrackingBlock(order, tpl as Record<string, string>) : ''}

          ${renderShipToBlock(ship, customerName, lang)}

          <p style="margin:32px 0 0 0;font-size:14px;line-height:1.55;color:#78716c;">${escapeHtml(tpl.outro)}</p>
        </td></tr>
        <tr><td style="background:#fafaf9;padding:16px 32px;font-size:12px;color:#a8a29e;text-align:center;">
          Kibay · República Dominicana · <a href="https://kibay.com.do" style="color:#a8a29e;text-decoration:underline;">kibay.com.do</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
	return { subject, html };
}

function renderItemsTable(
	items: Item[],
	fmt: (c: number) => string,
	tpl: Record<string, string>,
	order: Order,
	_symbol: string,
): string {
	const rows = items
		.map(
			(i) => `<tr>
        <td style="padding:8px 0;font-size:14px;color:#1c1917;">${escapeHtml(i.product_name)} <span style="color:#a8a29e;">× ${i.quantity}</span></td>
        <td style="padding:8px 0;font-size:14px;color:#1c1917;text-align:right;">${fmt(i.total_price)}</td>
      </tr>`,
		)
		.join('');
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 24px 0;">
    <tr><td colspan="2" style="padding:0 0 8px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#78716c;">${escapeHtml(tpl.itemsLabel)}</td></tr>
    ${rows}
    <tr><td colspan="2" style="border-top:1px solid #e7e5e4;padding-top:8px;"></td></tr>
    ${order.subtotal_amount != null ? `<tr><td style="padding:4px 0;font-size:14px;color:#78716c;">${escapeHtml(tpl.subtotalLabel)}</td><td style="padding:4px 0;font-size:14px;color:#78716c;text-align:right;">${fmt(order.subtotal_amount)}</td></tr>` : ''}
    ${order.shipping_amount != null ? `<tr><td style="padding:4px 0;font-size:14px;color:#78716c;">${escapeHtml(tpl.shippingLabel)}</td><td style="padding:4px 0;font-size:14px;color:#78716c;text-align:right;">${fmt(order.shipping_amount)}</td></tr>` : ''}
    <tr><td style="padding:8px 0 0 0;font-size:15px;font-weight:600;color:#1c1917;">${escapeHtml(tpl.totalLabel)}</td><td style="padding:8px 0 0 0;font-size:15px;font-weight:600;color:#1c1917;text-align:right;">${fmt(order.total_amount)}</td></tr>
  </table>`;
}

function renderTrackingBlock(order: Order, tpl: Record<string, string>): string {
	if (!order.tracking_number) return '';
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;background:#fafaf9;border-radius:8px;">
    <tr><td style="padding:16px;">
      <div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#78716c;margin-bottom:6px;">${escapeHtml(tpl.trackingLabel)}</div>
      <div style="font-size:16px;font-weight:600;color:#1c1917;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,monospace;">${escapeHtml(order.tracking_number)}</div>
      ${order.shipping_method ? `<div style="font-size:13px;color:#78716c;margin-top:6px;">${escapeHtml(tpl.methodLabel)}: ${escapeHtml(order.shipping_method)}</div>` : ''}
    </td></tr>
  </table>`;
}

function renderShipToBlock(ship: Record<string, string>, name: string, lang: 'es' | 'en'): string {
	const label = lang === 'es' ? 'Envío a' : 'Ship to';
	const lines = [
		name,
		ship.address,
		[ship.city, ship.zipCode].filter(Boolean).join(', '),
		ship.country,
	]
		.filter(Boolean)
		.map((l) => `<div style="font-size:14px;color:#44403c;line-height:1.5;">${escapeHtml(String(l))}</div>`)
		.join('');
	if (!lines) return '';
	return `<div style="margin:0 0 8px 0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#78716c;">${escapeHtml(label)}</div>${lines}`;
}

function escapeHtml(s: string): string {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
