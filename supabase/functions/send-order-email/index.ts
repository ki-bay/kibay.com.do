// Sends transactional order emails via Brevo (formerly Sendinblue).
//
// Caller may be:
//   - An Edge Function with the service-role key in the Authorization header
//     (used by stripe-webhook on payment_intent.succeeded / charge.refunded).
//   - An admin user calling from the dashboard (Resend confirmation /
//     Send tracking buttons in AdminOrdersPage).
//
// Body: { order_id: uuid, type: 'confirmation' | 'tracking' | 'refund' | 'abandoned_cart' | 'admin_new_order' | 'admin_refunded' }
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
	const VALID_TYPES = ['confirmation', 'tracking', 'refund', 'abandoned_cart', 'admin_new_order', 'admin_refunded'];
	if (!VALID_TYPES.includes(type as string)) {
		return json({ error: `type must be one of ${VALID_TYPES.join(' | ')}` }, 400);
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
	const isAdminEmail = type === 'admin_new_order' || type === 'admin_refunded';
	const to = isAdminEmail ? adminNotifyEmail : ship.email;
	if (!to) {
		return json(
			{ error: isAdminEmail ? 'ADMIN_NOTIFY_EMAIL not set' : 'Order has no shipping email' },
			400,
		);
	}

	const lang: 'es' | 'en' = order.currency === 'USD' ? 'en' : 'es';
	// Admin emails are always English regardless of the customer's locale.
	const renderLang: 'es' | 'en' = isAdminEmail ? 'en' : lang;
	const { subject, html } = renderEmail(type, order, items || [], renderLang);

	const recipientName = isAdminEmail
		? 'Kibay Admin'
		: `${ship.firstName || ''} ${ship.lastName || ''}`.trim() || undefined;

	// BCC removed: admin gets dedicated admin_new_order / admin_refunded
	// emails instead, so we no longer need to copy them on the customer's.
	// Note: abandoned_cart is a customer email but intentionally NEVER BCCs
	// admin — we don't want to spam the owner with every transient cart drop.
	const wantsBcc =
		false &&
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
	abandoned_cart: {
		es: {
			subject: (o: Order) => `¿Olvidaste algo? — Pedido ${o.order_number}`,
			heading: 'Tu pedido te está esperando',
			intro: 'Vimos que empezaste un pedido pero no llegaste al pago. No te preocupes — está guardado por un rato más. Termina cuando puedas.',
			itemsLabel: 'Productos en tu carrito',
			subtotalLabel: 'Subtotal',
			shippingLabel: 'Envío',
			totalLabel: 'Total',
			shipToLabel: 'Envío a',
			outro: 'Si decides terminar la compra, vuelve a kibay.com.do/cart o responde a este correo si tienes alguna pregunta.',
			ctaLabel: 'Terminar mi pedido',
		},
		en: {
			subject: (o: Order) => `Did you forget something? — Order ${o.order_number}`,
			heading: 'Your order is still waiting',
			intro: "We saw you started an order but didn't make it to payment. Don't worry — it's still saved for a little while. Finish when you can.",
			itemsLabel: 'Items in your cart',
			subtotalLabel: 'Subtotal',
			shippingLabel: 'Shipping',
			totalLabel: 'Total',
			shipToLabel: 'Ship to',
			outro: 'To finish your order, head to kibay.com.do/cart or reply to this email with any questions.',
			ctaLabel: 'Finish my order',
		},
	},
	admin_new_order: {
		en: {
			subject: (o: Order) => `[Kibay] New order ${o.order_number}`,
			heading: 'New paid order',
			intro: 'A customer just completed checkout. Details below.',
		},
	},
	admin_refunded: {
		en: {
			subject: (o: Order) => `[Kibay] Refunded ${o.order_number}`,
			heading: 'Order refunded',
			intro: 'A refund was processed for the order below.',
		},
	},
};

function renderEmail(
	type: 'confirmation' | 'tracking' | 'refund' | 'abandoned_cart' | 'admin_new_order' | 'admin_refunded',
	order: Order,
	items: Item[],
	lang: 'es' | 'en',
): { subject: string; html: string } {
	if (type === 'admin_new_order' || type === 'admin_refunded') {
		return renderAdminEmail(type, order, items);
	}
	const tpl = T[type][lang];
	const subject = tpl.subject(order);
	const symbol = order.currency === 'USD' ? '$' : 'RD$';
	const fmt = (cents: number) => `${symbol}${(Number(cents) / 100).toFixed(2)}`;
	const ship = order.shipping_address || {};
	const customerName = `${ship.firstName || ''} ${ship.lastName || ''}`.trim() || ship.email || '';

	// abandoned_cart shares confirmation's full layout (line items + totals)
	// but adds a prominent CTA back to the cart so the customer can finish.
	const showItems = type === 'confirmation' || type === 'abandoned_cart';
	const showCta = type === 'abandoned_cart';
	const ctaLabel = showCta ? (tpl as Record<string, string>).ctaLabel || 'Finish my order' : '';

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

          ${showItems ? renderItemsTable(items, fmt, tpl as Record<string, string>, order, symbol) : ''}

          ${type === 'tracking' ? renderTrackingBlock(order, tpl as Record<string, string>) : ''}

          ${showCta ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;"><tr><td align="center"><a href="https://kibay.com.do/cart" style="display:inline-block;padding:14px 28px;background:#FF7500;color:#ffffff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.01em;">${escapeHtml(ctaLabel)}</a></td></tr></table>` : ''}

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

function renderAdminEmail(
	type: 'admin_new_order' | 'admin_refunded',
	order: Order,
	items: Item[],
): { subject: string; html: string } {
	const tpl = (T as Record<string, Record<'en', { subject: (o: Order) => string; heading: string; intro: string }>>)[type].en;
	const subject = tpl.subject(order);
	const symbol = order.currency === 'USD' ? '$' : 'RD$';
	const fmt = (cents: number) => `${symbol}${(Number(cents) / 100).toFixed(2)}`;
	const ship = order.shipping_address || {};
	const customerName = `${ship.firstName || ''} ${ship.lastName || ''}`.trim() || ship.email || '—';
	const itemsRows = items
		.map(
			(i) => `<tr>
      <td style="padding:6px 0;font-size:13px;color:#1c1917;">${escapeHtml(i.product_name)}</td>
      <td style="padding:6px 0;font-size:13px;color:#1c1917;text-align:right;">×${i.quantity}</td>
      <td style="padding:6px 0;font-size:13px;color:#1c1917;text-align:right;">${fmt(i.total_price)}</td>
    </tr>`,
		)
		.join('');

	const adminUrl = `https://kibay.com.do/admin/orders`;
	const stripeUrl = (order as { stripe_payment_intent_id?: string }).stripe_payment_intent_id
		? `https://dashboard.stripe.com/test/payments/${(order as { stripe_payment_intent_id: string }).stripe_payment_intent_id}`
		: null;

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1917;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f4;padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;background:#ffffff;border:1px solid #e7e5e4;border-radius:8px;">
        <tr><td style="padding:20px 24px;border-bottom:1px solid #e7e5e4;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a8a29e;">Kibay admin</div>
          <h1 style="margin:4px 0 0 0;font-size:18px;font-weight:600;color:#1c1917;">${escapeHtml(tpl.heading)} — ${escapeHtml(order.order_number)}</h1>
          <p style="margin:4px 0 0 0;font-size:13px;color:#78716c;">${escapeHtml(tpl.intro)}</p>
        </td></tr>
        <tr><td style="padding:20px 24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px;color:#44403c;">
            <tr><td style="padding:4px 0;color:#78716c;width:130px;">Total</td><td style="padding:4px 0;font-weight:600;color:#1c1917;">${fmt(order.total_amount)} ${escapeHtml(order.currency)}</td></tr>
            <tr><td style="padding:4px 0;color:#78716c;">Customer</td><td style="padding:4px 0;">${escapeHtml(customerName)}</td></tr>
            <tr><td style="padding:4px 0;color:#78716c;">Email</td><td style="padding:4px 0;"><a href="mailto:${escapeHtml(ship.email || '')}" style="color:#1c1917;">${escapeHtml(ship.email || '—')}</a></td></tr>
            ${ship.phone ? `<tr><td style="padding:4px 0;color:#78716c;">Phone</td><td style="padding:4px 0;"><a href="tel:${escapeHtml(ship.phone)}" style="color:#1c1917;">${escapeHtml(ship.phone)}</a></td></tr>` : ''}
            <tr><td style="padding:4px 0;color:#78716c;vertical-align:top;">Ship to</td><td style="padding:4px 0;">${escapeHtml([ship.address, [ship.city, ship.zipCode].filter(Boolean).join(', '), ship.country].filter(Boolean).join(' · '))}</td></tr>
            ${order.shipping_method ? `<tr><td style="padding:4px 0;color:#78716c;">Shipping method</td><td style="padding:4px 0;">${escapeHtml(order.shipping_method)}</td></tr>` : ''}
            ${(order as { coupon_code?: string }).coupon_code ? `<tr><td style="padding:4px 0;color:#78716c;">Coupon</td><td style="padding:4px 0;">${escapeHtml((order as { coupon_code: string }).coupon_code)}</td></tr>` : ''}
          </table>
        </td></tr>
        ${itemsRows ? `<tr><td style="padding:0 24px 20px;">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a8a29e;margin-bottom:8px;">Line items</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top:1px solid #e7e5e4;">
            ${itemsRows}
          </table>
        </td></tr>` : ''}
        <tr><td style="padding:0 24px 24px;">
          <a href="${adminUrl}" style="display:inline-block;padding:10px 16px;background:#1c1917;color:#ffffff;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;">Open in admin</a>
          ${stripeUrl ? `&nbsp;<a href="${stripeUrl}" style="display:inline-block;padding:10px 16px;background:#ffffff;border:1px solid #e7e5e4;color:#1c1917;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;">View in Stripe</a>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
	return { subject, html };
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
