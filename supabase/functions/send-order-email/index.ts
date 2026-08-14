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
const fromAddress = Deno.env.get('ORDER_EMAIL_FROM') || '';
// Calendar link signing — must match the Worker's EMAIL_LINK_SECRET so the
// /calendar/order/:id.ics endpoint can verify the signature this email mints.
// WORKER_BASE_URL is also the relay target for actually sending the email
// (see the /transactional/send call below — Brevo blocks Supabase Edge
// Functions' rotating egress IPs, so we no longer call Brevo directly here).
const emailLinkSecret = Deno.env.get('EMAIL_LINK_SECRET') || '';
const workerBaseUrl = Deno.env.get('WORKER_BASE_URL') || '';
// Auth for the /transactional/send relay call — a dedicated token, not
// serviceKey. Supabase's auto-injected SUPABASE_SERVICE_ROLE_KEY no longer
// string-matches what's set on the Cloudflare Worker (confirmed live
// 2026-08-14, mid platform key migration), so this is minted and set
// independently on both sides instead of depending on that match.
const transactionalRelayToken = Deno.env.get('TRANSACTIONAL_RELAY_TOKEN') || '';
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

	const sender = parseFrom(fromAddress);
	if (!sender) {
		console.error('ORDER_EMAIL_FROM not set or invalid');
		return json({ error: 'Sender address not configured' }, 500);
	}

	const auth = req.headers.get('authorization') || '';
	const token = auth.replace(/^Bearer\s+/i, '');
	if (!token) return json({ error: 'Missing authorization' }, 401);

	// Either the caller is service-role (server-to-server), or an admin user.
	// Supabase rotated to a new key system (sb_secret_*) — accept either the
	// legacy SUPABASE_SERVICE_ROLE_KEY OR any key in the new SUPABASE_SECRET_KEYS
	// rotation set (CSV) so server-to-server callers don't break on rotation.
	const legacyService = serviceKey;
	const newSecret = Deno.env.get('SUPABASE_SECRET_KEY') || '';
	const rotatedKeys = (Deno.env.get('SUPABASE_SECRET_KEYS') || '')
		.split(',')
		.map((k) => k.trim())
		.filter(Boolean);
	const isServiceRole =
		token === legacyService ||
		token === newSecret ||
		rotatedKeys.includes(token);
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

	// Hydrate items[].metadata.duration_minutes from the products table so we
	// can compute calendar end-times for experience reservations. Wine bottles
	// have no product_id reservation needs — they no-op.
	const reservationItems = (items || []).filter((i) => (i as Item).metadata?.reservation_date);
	if (reservationItems.length > 0) {
		const productIds = Array.from(
			new Set(reservationItems.map((i) => (i as Item).product_id).filter(Boolean)),
		) as string[];
		if (productIds.length > 0) {
			const { data: productRows } = await admin
				.from('products')
				.select('id, metadata')
				.in('id', productIds);
			const durationByProduct = new Map<string, number>();
			for (const p of (productRows || []) as Array<{ id: string; metadata: { duration_minutes?: number } | null }>) {
				if (typeof p.metadata?.duration_minutes === 'number') {
					durationByProduct.set(p.id, p.metadata.duration_minutes);
				}
			}
			for (const it of reservationItems) {
				const i = it as Item;
				if (i.product_id && durationByProduct.has(i.product_id)) {
					i.metadata = {
						...(i.metadata || {}),
						duration_minutes: durationByProduct.get(i.product_id),
					};
				}
			}
		}
	}

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

	// Pull editable copy from email_templates (admin-managed). If the row is
	// missing or the query fails, renderEmail falls back to the hardcoded T.
	let dbTpl: DbTemplate | null = null;
	try {
		const { data: tplRow } = await admin
			.from('email_templates')
			.select('*')
			.eq('type', type as string)
			.eq('lang', renderLang)
			.maybeSingle();
		if (tplRow) dbTpl = tplRow as DbTemplate;
	} catch (err) {
		console.error('email_templates read failed, falling back to defaults', err);
	}

	const { subject, html } = await renderEmail(type, order, items || [], renderLang, dbTpl);

	const recipientName = isAdminEmail
		? 'Kibay Admin'
		: `${ship.firstName || ''} ${ship.lastName || ''}`.trim() || undefined;

	// Relay through the Cloudflare Worker rather than calling Brevo directly.
	// Supabase Edge Functions run on Deno Deploy's rotating pool of egress
	// IPs, which Brevo's IP-allowlist security silently rejects
	// ("unrecognised IP address") — confirmed live 2026-08-14, every order
	// confirmation + admin notification was failing with no visible error on
	// the customer-facing side (the success page's "confirmation sent" line
	// is static copy, not a delivery confirmation). The Worker's egress is
	// already Brevo-trusted (same fix used for the marketing pipeline).
	if (!workerBaseUrl || !transactionalRelayToken) {
		console.error('WORKER_BASE_URL or TRANSACTIONAL_RELAY_TOKEN not set — cannot relay email');
		return json({ error: 'Email relay not configured' }, 500);
	}
	const resp = await fetch(`${workerBaseUrl}/transactional/send`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${transactionalRelayToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			to,
			toName: recipientName,
			subject,
			htmlContent: html,
			fromName: sender.name,
			fromEmail: sender.email,
		}),
	});
	if (!resp.ok) {
		const errText = await resp.text();
		console.error('Transactional relay send failed', resp.status, errText);
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
	product_id?: string;
	// Per-line metadata. Experiences carry { reservation_date, reservation_time }
	// (date is YYYY-MM-DD, time is HH:MM, both treated as AST=UTC-4). Other
	// items have an empty {} default.
	metadata?: {
		reservation_date?: string;
		reservation_time?: string;
		duration_minutes?: number;
	} | null;
};

// Row shape from public.email_templates. All copy fields are optional at the
// type level so we can layer them over the hardcoded T defaults — any missing
// column falls back to the baked-in string.
type DbTemplate = {
	type: string;
	lang: string;
	subject?: string | null;
	heading?: string | null;
	intro?: string | null;
	outro?: string | null;
	items_label?: string | null;
	subtotal_label?: string | null;
	shipping_label?: string | null;
	total_label?: string | null;
	ship_to_label?: string | null;
	tracking_label?: string | null;
	method_label?: string | null;
	cta_label?: string | null;
};

// {{order_number}} is the only supported placeholder in DB-stored subjects.
function applySubjectVars(template: string, order: Order): string {
	return String(template ?? '').replace(/\{\{\s*order_number\s*\}\}/g, String(order.order_number ?? ''));
}

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

async function renderEmail(
	type: 'confirmation' | 'tracking' | 'refund' | 'abandoned_cart' | 'admin_new_order' | 'admin_refunded',
	order: Order,
	items: Item[],
	lang: 'es' | 'en',
	dbTpl: DbTemplate | null = null,
): Promise<{ subject: string; html: string }> {
	if (type === 'admin_new_order' || type === 'admin_refunded') {
		return await renderAdminEmail(type, order, items, dbTpl);
	}
	const defaults = T[type][lang] as Record<string, unknown>;
	// Build a merged view: prefer DB value, fall back to hardcoded default.
	const subject = dbTpl?.subject
		? applySubjectVars(dbTpl.subject, order)
		: (defaults.subject as (o: Order) => string)(order);
	const tpl = {
		heading: dbTpl?.heading ?? (defaults.heading as string),
		intro: dbTpl?.intro ?? (defaults.intro as string),
		outro: dbTpl?.outro ?? (defaults.outro as string),
		itemsLabel: dbTpl?.items_label ?? (defaults.itemsLabel as string),
		subtotalLabel: dbTpl?.subtotal_label ?? (defaults.subtotalLabel as string),
		shippingLabel: dbTpl?.shipping_label ?? (defaults.shippingLabel as string),
		totalLabel: dbTpl?.total_label ?? (defaults.totalLabel as string),
		shipToLabel: dbTpl?.ship_to_label ?? (defaults.shipToLabel as string),
		trackingLabel: dbTpl?.tracking_label ?? (defaults.trackingLabel as string),
		methodLabel: dbTpl?.method_label ?? (defaults.methodLabel as string),
		ctaLabel: dbTpl?.cta_label ?? (defaults.ctaLabel as string),
	} as Record<string, string>;
	const symbol = order.currency === 'USD' ? '$' : 'RD$';
	const fmt = (cents: number) => `${symbol}${(Number(cents) / 100).toFixed(2)}`;
	const ship = order.shipping_address || {};
	const customerName = `${ship.firstName || ''} ${ship.lastName || ''}`.trim() || ship.email || '';

	// abandoned_cart shares confirmation's full layout (line items + totals)
	// but adds a prominent CTA back to the cart so the customer can finish.
	const showItems = type === 'confirmation' || type === 'abandoned_cart';
	const showCta = type === 'abandoned_cart';
	const ctaLabel = showCta ? tpl.ctaLabel || 'Finish my order' : '';

	// Reservation block — rendered for any order containing experience line items.
	// Goes between the intro paragraph and the items table in the email body.
	const reservationBlock =
		type === 'confirmation' || type === 'abandoned_cart'
			? await renderReservationBlock(items, lang, String(order.id || ''), String(order.order_number || ''))
			: '';

	const taglineEs = 'Vino espumoso orgánico premium de la República Dominicana. Elaborado con pasión, sostenibilidad y los mejores frutos locales.';
	const taglineEn = 'Premium organic sparkling wine from the Dominican Republic. Crafted with passion, sustainability, and the finest local fruits.';
	const copyrightEs = '© Kibay · Hecho en la República Dominicana';
	const copyrightEn = '© Kibay · Made in the Dominican Republic';
	const tagline = lang === 'es' ? taglineEs : taglineEn;
	const copyright = lang === 'es' ? copyrightEs : copyrightEn;

	// Legal entity disclaimer (DGII compliance). MUST MATCH the data in
	// src/lib/legalEntity.js — Edge Functions can't import from the SPA bundle
	// so the strings are duplicated. If the legal entity changes, update BOTH.
	const legalLineEs = `LADISON DOMINICANA SRL · RNC 131128033 · Licencia de Fabricación de Vinos VINO-022 (DGII, emitida 17/06/2023)`;
	const legalLineEn = `LADISON DOMINICANA SRL · RNC 131128033 · Wine Manufacturing License VINO-022 (DGII, issued 06/17/2023)`;
	const legalLine = lang === 'es' ? legalLineEs : legalLineEn;

	const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f0;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <tr><td style="padding:32px 40px 0;" align="center">
          <img src="https://kibay.com.do/logo.png" alt="Kibay" width="96" height="72" style="display:block;margin:0 auto;border:0;height:auto;max-width:96px;" />
          <div style="height:2px;width:56px;background:#D4A574;margin:12px auto 0;"></div>
        </td></tr>
        <tr><td style="padding:24px 40px 0;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;">${lang === 'es' ? 'Pedido' : 'Order'} ${escapeHtml(order.order_number)}</div>
          <h1 style="margin:8px 0 0 0;font-size:22px;font-weight:600;line-height:1.3;color:#1a1a1a;">${escapeHtml(tpl.heading)}</h1>
          <p style="margin:12px 0 0 0;font-size:15px;line-height:1.6;color:#555;">${escapeHtml(tpl.intro)}</p>
        </td></tr>
        <tr><td style="padding:24px 40px 0;">
          ${reservationBlock}
          ${showItems ? renderItemsTable(items, fmt, tpl as Record<string, string>, order, symbol) : ''}
          ${type === 'tracking' ? renderTrackingBlock(order, tpl as Record<string, string>) : ''}
          ${showCta ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;"><tr><td align="center"><a href="https://kibay.com.do/cart" style="display:inline-block;padding:14px 32px;background:#1a1a1a;color:#ffffff;border-radius:8px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">${escapeHtml(ctaLabel)}</a></td></tr></table>` : ''}
          ${
            (type === 'confirmation' || type === 'refund' || type === 'tracking') && (order as { guest_lookup_token?: string }).guest_lookup_token
              ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;"><tr><td align="center"><a href="https://kibay.com.do/checkout-success?order_id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(String((order as { guest_lookup_token?: string }).guest_lookup_token))}" style="display:inline-block;padding:12px 28px;background:#D4A574;color:#1a1a1a;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">${lang === 'es' ? 'Ver mi pedido' : 'View my order'}</a></td></tr></table>`
              : ''
          }
          ${renderShipToBlock(ship, customerName, lang, tpl.shipToLabel)}
          <p style="margin:24px 0 0 0;font-size:14px;line-height:1.6;color:#666;">${escapeHtml(tpl.outro)}</p>
        </td></tr>
        <tr><td style="padding:28px 40px 0;">
          <div style="height:1px;background:#eee;"></div>
        </td></tr>
        <tr><td style="padding:24px 40px 32px;text-align:center;">
          <div aria-label="KIBAY" style="font-family:'Montserrat',Helvetica,Arial,sans-serif;font-size:18px;font-weight:500;color:#1a1a1a;letter-spacing:0.05em;">KiBΛY</div>
          <div style="font-size:12px;color:#777;margin-top:6px;line-height:1.5;max-width:420px;margin-left:auto;margin-right:auto;">${escapeHtml(tagline)}</div>
          <div style="font-size:11px;color:#999;margin-top:14px;">Bahía de Ocoa, Km 6 1/2 Hatillo, Azua 71003 · ${lang === 'es' ? 'República Dominicana' : 'Dominican Republic'}</div>
          <div style="margin-top:16px;">
            <a href="https://www.instagram.com/kibaywine" style="display:inline-block;margin:0 6px;color:#888;font-size:12px;text-decoration:none;">Instagram</a><span style="color:#ddd;">·</span>
            <a href="https://www.facebook.com/profile.php?id=61589761255222" style="display:inline-block;margin:0 6px;color:#888;font-size:12px;text-decoration:none;">Facebook</a><span style="color:#ddd;">·</span>
            <a href="https://www.tiktok.com/@kibaywine" style="display:inline-block;margin:0 6px;color:#888;font-size:12px;text-decoration:none;">TikTok</a><span style="color:#ddd;">·</span>
            <a href="https://www.linkedin.com/company/116054911" style="display:inline-block;margin:0 6px;color:#888;font-size:12px;text-decoration:none;">LinkedIn</a>
          </div>
          <div style="font-size:11px;color:#aaa;margin-top:14px;">
            <a href="mailto:info@kibay.com.do" style="color:#aaa;text-decoration:none;">info@kibay.com.do</a> · <a href="https://kibay.com.do" style="color:#aaa;text-decoration:none;">kibay.com.do</a>
          </div>
          <div style="font-size:10px;color:#bbb;margin-top:14px;letter-spacing:0.5px;text-transform:uppercase;">${escapeHtml(copyright)}</div>
          <div style="font-size:10px;color:#9a9a9a;margin-top:8px;line-height:1.5;max-width:480px;margin-left:auto;margin-right:auto;">${escapeHtml(legalLine)}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
	return { subject, html };
}

// ---------------------------------------------------------------------------
// Reservation block (experience products only)
// ---------------------------------------------------------------------------

// AST (Atlantic Standard Time, used in Dominican Republic) is UTC-4 year-round.
// Reservation dates/times are stored as YYYY-MM-DD + HH:MM in AST and converted
// to UTC here for both the Google Calendar link and the ICS DTSTART.
const AST_OFFSET_MINUTES = 4 * 60;

function reservationToUtc(dateStr: string, timeStr: string): Date {
	// dateStr 'YYYY-MM-DD', timeStr 'HH:MM' (24h, AST). Build a UTC Date by
	// constructing the AST wall-clock time and shifting +4h.
	const [y, m, d] = dateStr.split('-').map(Number);
	const [hh, mm] = timeStr.split(':').map(Number);
	// Date.UTC builds a UTC epoch from UTC components; add 4h so 11:00 AST -> 15:00 UTC.
	return new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0) + AST_OFFSET_MINUTES * 60 * 1000);
}

function fmtIcsUtc(d: Date): string {
	// YYYYMMDDTHHMMSSZ — used by both Google Calendar URL and ICS DTSTART/DTEND.
	const pad = (n: number): string => String(n).padStart(2, '0');
	return (
		`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
		`T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
	);
}

function fmtReservationDisplay(dateStr: string, lang: 'es' | 'en'): string {
	// Render the date in the customer's locale. Time is shown separately.
	const [y, m, d] = dateStr.split('-').map(Number);
	const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0));
	const locale = lang === 'es' ? 'es-DO' : 'en-US';
	try {
		return new Intl.DateTimeFormat(locale, {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC',
		}).format(dt);
	} catch {
		return dateStr;
	}
}

async function hmacHex(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

// Sign a calendar URL the worker can verify. Payload `cal.<orderId>` mirrors the
// `unsub.<email>` / `<id>.<action>.<exp>` pattern already used by the worker.
async function signCalendarUrlForOrder(orderId: string): Promise<string | null> {
	if (!emailLinkSecret || !workerBaseUrl) return null;
	const sig = await hmacHex(emailLinkSecret, `cal.${orderId}`);
	return `${workerBaseUrl}/calendar/order/${encodeURIComponent(orderId)}.ics?sig=${sig}`;
}

function googleCalendarUrl(
	productName: string,
	startUtc: Date,
	endUtc: Date,
	location: string,
	details: string,
): string {
	const params = new URLSearchParams({
		text: `Reserva Kibay: ${productName}`,
		dates: `${fmtIcsUtc(startUtc)}/${fmtIcsUtc(endUtc)}`,
		details,
		location,
	});
	return `https://calendar.google.com/calendar/u/0/r/eventedit?${params.toString()}`;
}

const RESERVATION_LOCATION =
	'Bahía de Ocoa, Carretera Hatillo Palmar de Ocoa Km 6/12, Hatillo, Azua 71003, DO';

async function renderReservationBlock(
	items: Item[],
	lang: 'es' | 'en',
	orderId: string,
	orderNumber: string = '',
): Promise<string> {
	const reservations = items.filter((i) => i.metadata?.reservation_date);
	if (reservations.length === 0) return '';

	const t = {
		es: {
			heading: 'Tu reserva',
			date: 'Fecha',
			time: 'Hora',
			place: 'Lugar',
			placeValue: 'Bahía de Ocoa',
			gcal: 'Añadir a Google Calendar',
			ics: 'Apple / Outlook (ICS)',
			details: 'Detalles de tu reserva en Kibay (Bahía de Ocoa).',
			qrCaption: 'Muestra este código al llegar a Bahía de Ocoa',
		},
		en: {
			heading: 'Your reservation',
			date: 'Date',
			time: 'Time',
			place: 'Where',
			placeValue: 'Bahía de Ocoa',
			gcal: 'Add to Google Calendar',
			ics: 'Apple / Outlook (ICS)',
			details: 'Details for your Kibay reservation (Bahía de Ocoa).',
			qrCaption: 'Show this code on arrival at Bahía de Ocoa',
		},
	}[lang];

	const cards = reservations
		.map((i) => {
			const date = i.metadata!.reservation_date!;
			const time = i.metadata!.reservation_time || '11:00';
			const dispDate = fmtReservationDisplay(date, lang);
			return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafaf9;border-radius:10px;margin:0 0 12px 0;">
				<tr><td style="padding:16px 18px;">
					<div style="font-size:13px;font-weight:600;color:#1c1917;margin-bottom:8px;">${escapeHtml(i.product_name)}</div>
					<div style="font-size:13px;color:#44403c;line-height:1.7;">
						<div><span style="color:#78716c;">${escapeHtml(t.date)}:</span> ${escapeHtml(dispDate)}</div>
						<div><span style="color:#78716c;">${escapeHtml(t.time)}:</span> ${escapeHtml(time)} (AST)</div>
						<div><span style="color:#78716c;">${escapeHtml(t.place)}:</span> ${escapeHtml(t.placeValue)}</div>
					</div>
				</td></tr>
			</table>`;
		})
		.join('');

	// Use the FIRST reservation to build the Google Calendar URL — Google Calendar's
	// event creator only handles one event at a time. The .ics file contains every
	// VEVENT so the customer can import them all at once.
	const first = reservations[0];
	const startUtc = reservationToUtc(
		first.metadata!.reservation_date!,
		first.metadata!.reservation_time || '11:00',
	);
	const durationMin = first.metadata!.duration_minutes || 120;
	const endUtc = new Date(startUtc.getTime() + durationMin * 60 * 1000);
	const gcalHref = googleCalendarUrl(
		first.product_name,
		startUtc,
		endUtc,
		RESERVATION_LOCATION,
		t.details,
	);

	const icsHref = await signCalendarUrlForOrder(orderId);

	const buttons = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px 0;">
		<tr>
			<td style="padding-right:8px;">
				<a href="${gcalHref}" style="display:inline-block;padding:12px 20px;background:#1a73e8;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(t.gcal)}</a>
			</td>
			${icsHref ? `<td><a href="${icsHref}" style="display:inline-block;padding:12px 20px;background:#1c1917;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(t.ics)}</a></td>` : ''}
		</tr>
	</table>`;

	// QR code: encodes a deep link to the admin order page. When staff at
	// Ocoa Bay scans the code on the customer's phone (or printed email),
	// it opens the order in the admin dashboard (auth-gated). For the
	// customer it's also a portable proof-of-reservation — show on arrival.
	const qrTarget = orderNumber
		? `https://kibay.com.do/admin/orders?order=${encodeURIComponent(orderNumber)}`
		: `https://kibay.com.do/admin/orders?id=${encodeURIComponent(orderId)}`;
	const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=2&data=${encodeURIComponent(qrTarget)}`;
	const qrBlock = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0 4px 0;background:#ffffff;border:1px solid #eee;border-radius:10px;">
		<tr><td style="padding:18px;text-align:center;">
			<img src="${qrSrc}" width="180" height="180" alt="${escapeHtml(t.qrCaption)}" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;" />
			<div style="font-size:11px;color:#999;margin-top:10px;">${escapeHtml(t.qrCaption)}</div>
			${orderNumber ? `<div style="font-family:Menlo,Consolas,monospace;font-size:12px;color:#666;margin-top:6px;">${escapeHtml(orderNumber)}</div>` : ''}
		</td></tr>
	</table>`;

	return `<div style="margin:0 0 24px 0;">
		<div style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#78716c;margin-bottom:10px;">${escapeHtml(t.heading)}</div>
		${cards}
		${buttons}
		${qrBlock}
	</div>`;
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

async function renderAdminEmail(
	type: 'admin_new_order' | 'admin_refunded',
	order: Order,
	items: Item[],
	dbTpl: DbTemplate | null = null,
): Promise<{ subject: string; html: string }> {
	const defaults = (T as Record<string, Record<'en', { subject: (o: Order) => string; heading: string; intro: string }>>)[type].en;
	const tpl = {
		heading: dbTpl?.heading ?? defaults.heading,
		intro: dbTpl?.intro ?? defaults.intro,
	};
	const subject = dbTpl?.subject
		? applySubjectVars(dbTpl.subject, order)
		: defaults.subject(order);
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

	// Compact reservation summary for admin: one row per experience line.
	// Lets the owner see at-a-glance who's coming when, without the full block.
	const reservations = items.filter((i) => i.metadata?.reservation_date);
	const reservationRows = reservations
		.map((i) => {
			const date = i.metadata!.reservation_date!;
			const time = i.metadata!.reservation_time || '11:00';
			const dispDate = fmtReservationDisplay(date, 'en');
			return `<tr><td style="padding:4px 0;color:#78716c;">Reservation</td><td style="padding:4px 0;"><strong>${escapeHtml(i.product_name)}</strong> — ${escapeHtml(dispDate)} at ${escapeHtml(time)} (AST)</td></tr>`;
		})
		.join('');

	// Full block (with cards + buttons) — admin gets the same calendar links so they
	// can also drop the event on their own calendar in one click.
	const reservationBlock = reservations.length > 0
		? await renderReservationBlock(items, 'en', String(order.id || ''), String(order.order_number || ''))
		: '';

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
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td style="vertical-align:middle;width:64px;"><img src="https://kibay.com.do/logo.png" alt="Kibay" width="56" height="42" style="display:block;border:0;height:auto;max-width:56px;" /></td>
            <td style="vertical-align:middle;padding-left:12px;">
              <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a8a29e;"><span aria-label="KIBAY" style="font-family:'Montserrat',Helvetica,Arial,sans-serif;font-weight:500;letter-spacing:0.05em;text-transform:none;">KiBΛY</span> admin</div>
              <h1 style="margin:4px 0 0 0;font-size:18px;font-weight:600;color:#1c1917;">${escapeHtml(tpl.heading)} — ${escapeHtml(order.order_number)}</h1>
              <p style="margin:4px 0 0 0;font-size:13px;color:#78716c;">${escapeHtml(tpl.intro)}</p>
            </td>
          </tr></table>
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
            ${reservationRows}
          </table>
        </td></tr>
        ${reservationBlock ? `<tr><td style="padding:0 24px 20px;">${reservationBlock}</td></tr>` : ''}
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

function renderShipToBlock(
	ship: Record<string, string>,
	name: string,
	lang: 'es' | 'en',
	labelOverride?: string,
): string {
	const label = labelOverride || (lang === 'es' ? 'Envío a' : 'Ship to');
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
