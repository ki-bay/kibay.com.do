// send-tasting-signup — RSVP handler for the Kibay-organized tasting event.
// =============================================================================
// Anon-callable. The tasting signup page POSTs { name, email, company, phone }.
// We persist the signup, email a confirmation to the submitter, and notify
// info@kibay.com.do with the details (reply-to set to the submitter).
//
// Required Edge Function secrets:
//   BREVO_API_KEY               xkeysib-... (already configured, shared with
//                                send-contact-email / send-order-email)
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (platform-injected)
//   TASTING_NOTIFY_TO           default 'info@kibay.com.do'

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const brevoKey = Deno.env.get('BREVO_API_KEY') || '';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const notifyTo = Deno.env.get('TASTING_NOTIFY_TO') || 'info@kibay.com.do';
const fromAddr = 'info@kibay.com.do';

const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...cors, 'Content-Type': 'application/json' },
	});
}

function escapeHtml(s: string): string {
	return (s || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

type Body = {
	name?: string;
	email?: string;
	company?: string;
	phone?: string;
};

async function sendBrevo(input: {
	to: { email: string; name?: string };
	replyTo?: { email: string; name?: string };
	subject: string;
	html: string;
	text: string;
}) {
	const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: { 'api-key': brevoKey, 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify({
			sender: { name: 'Kibay', email: fromAddr },
			to: [input.to],
			...(input.replyTo ? { replyTo: input.replyTo } : {}),
			subject: input.subject,
			htmlContent: input.html,
			textContent: input.text,
		}),
	});
	const body = await resp.json().catch(() => ({}));
	if (!resp.ok) throw new Error(`Brevo send failed: ${resp.status} ${JSON.stringify(body)}`);
	return body as { messageId?: string };
}

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
	if (!brevoKey) return json({ error: 'BREVO_API_KEY not set' }, 503);

	let body: Body;
	try {
		body = (await req.json()) as Body;
	} catch {
		return json({ error: 'Invalid JSON' }, 400);
	}

	const name = (body.name || '').trim().slice(0, 200);
	const email = (body.email || '').trim().toLowerCase().slice(0, 200);
	const company = (body.company || '').trim().slice(0, 200);
	const phone = (body.phone || '').trim().slice(0, 40);

	if (!name) return json({ error: 'name required' }, 400);
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'valid email required' }, 400);
	if (!company) return json({ error: 'company required' }, 400);

	// Persist the signup (best-effort — a DB hiccup shouldn't block the emails).
	try {
		const r = await fetch(`${supabaseUrl}/rest/v1/tasting_signups`, {
			method: 'POST',
			headers: {
				apikey: serviceKey,
				Authorization: `Bearer ${serviceKey}`,
				'Content-Type': 'application/json',
				Prefer: 'return=minimal',
			},
			body: JSON.stringify({ name, email, company, phone: phone || null, source: 'fine_dining_email' }),
		});
		if (!r.ok) console.error('tasting_signups insert failed:', r.status, await r.text());
	} catch (e) {
		console.error('tasting_signups insert threw:', e);
	}

	// Confirmation to the submitter.
	const confirmHtml = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;background:#f4f4f0;"><tr><td align="center">
<table role="presentation" width="600" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
<tr><td style="padding:28px 40px 0;" align="center">
  <div style="font-family:Georgia,serif;font-size:30px;font-weight:600;letter-spacing:1.5px;color:#1a1a1a;">Kibay</div>
  <div style="height:2px;width:56px;background:#D4A574;margin:12px auto 0;"></div>
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#aaa;margin-top:10px;padding-bottom:24px;">Vino Tropical Espumoso Sostenible del Caribe</div>
</td></tr>
<tr><td style="padding:12px 40px 8px;">
  <h1 style="margin:0;font-size:22px;font-weight:600;line-height:1.3;">Gracias, ${escapeHtml(name)} — está en la lista</h1>
  <p style="margin:14px 0 0;color:#666;font-size:15px;line-height:1.65;">Recibimos su interés en la próxima cata exclusiva de Kibay para ${escapeHtml(company)}. En cuanto confirmemos fecha y lugar, le escribiremos directamente a este correo con los detalles.</p>
</td></tr>
<tr><td style="padding:24px 40px 32px;"><p style="margin:0;color:#666;font-size:14px;line-height:1.6;">Saludos cordiales,<br/><strong style="color:#1a1a1a;">Equipo Comercial — Kibay</strong><br/><span style="color:#999;font-size:13px;">info@kibay.com.do · kibay.com.do</span></p></td></tr>
</table></td></tr></table></body></html>`;
	const confirmText = `Gracias, ${name} — está en la lista.\n\nRecibimos su interés en la próxima cata exclusiva de Kibay para ${company}. En cuanto confirmemos fecha y lugar, le escribiremos a este correo con los detalles.\n\nEquipo Comercial — Kibay\ninfo@kibay.com.do`;

	// Notification to Kibay.
	const notifyHtml = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,sans-serif;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
<tr><td style="padding:32px 40px;">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;">Nueva inscripción · cata Kibay</div>
  <h1 style="margin:8px 0 24px;font-size:22px;font-weight:600;color:#1a1a1a;">${escapeHtml(name)} — ${escapeHtml(company)}</h1>
  <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;width:100%;">
    <tr><td style="color:#888;width:120px;">Nombre</td><td style="font-weight:500;">${escapeHtml(name)}</td></tr>
    <tr><td style="color:#888;">Empresa</td><td>${escapeHtml(company)}</td></tr>
    <tr><td style="color:#888;">Email</td><td><a href="mailto:${escapeHtml(email)}" style="color:#D4A574;text-decoration:underline;">${escapeHtml(email)}</a></td></tr>
    <tr><td style="color:#888;">Teléfono</td><td>${escapeHtml(phone) || '—'}</td></tr>
  </table>
  <div style="margin-top:24px;padding-top:14px;border-top:1px solid #eee;font-size:11px;color:#aaa;">
    Reply-To ya apunta a ${escapeHtml(email)}.
  </div>
</td></tr></table></td></tr></table></body></html>`;
	const notifyText = `Nueva inscripción para la cata Kibay\n\nNombre: ${name}\nEmpresa: ${company}\nEmail: ${email}\nTeléfono: ${phone || '—'}`;

	try {
		const [confirmResult, notifyResult] = await Promise.all([
			sendBrevo({ to: { email, name }, subject: 'Confirmado — le avisaremos de la próxima cata Kibay', html: confirmHtml, text: confirmText }),
			sendBrevo({ to: { email: notifyTo, name: 'Kibay' }, replyTo: { email, name }, subject: `[Cata Kibay] Nueva inscripción — ${name} (${company})`, html: notifyHtml, text: notifyText }),
		]);
		return json({ ok: true, confirm_message_id: confirmResult.messageId, notify_message_id: notifyResult.messageId });
	} catch (e) {
		console.error('send-tasting-signup: Brevo send failed', e);
		return json({ error: 'send_failed', detail: String(e) }, 502);
	}
});
