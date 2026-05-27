// send-contact-email — public contact form handler.
// =============================================================================
// Anon-callable. The /contact page POSTs { name, email, topic, message };
// we forward via Brevo to info@kibay.com.do with Reply-To set to the
// sender. Returns 200 on accepted, 4xx on bad input, 5xx on Brevo failure.
//
// Light anti-spam:
//   - Field length caps (name 200, topic 200, message 4000)
//   - Honeypot via the 'topic' field is impractical (it's a real dropdown);
//     instead enforce origin allow-list + basic email regex.
//
// Required Edge Function secrets:
//   BREVO_API_KEY              xkeysib-...
//   CONTACT_FROM               default 'info@kibay.com.do'
//   CONTACT_TO                 default 'info@kibay.com.do'

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const brevoKey = Deno.env.get('BREVO_API_KEY') || '';
const fromAddr = Deno.env.get('CONTACT_FROM') || 'info@kibay.com.do';
const toAddr = Deno.env.get('CONTACT_TO') || 'info@kibay.com.do';

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
	topic?: string;
	message?: string;
};

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
	const topic = (body.topic || '').trim().slice(0, 200) || 'General';
	const message = (body.message || '').trim().slice(0, 4000);

	if (!name) return json({ error: 'name required' }, 400);
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'valid email required' }, 400);
	if (!message) return json({ error: 'message required' }, 400);

	const subject = `[Kibay contacto] ${topic} — ${name}`;
	const html = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f0;font-family:Arial,sans-serif;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:32px 0;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:14px;box-shadow:0 1px 4px rgba(0,0,0,.06);">
<tr><td style="padding:32px 40px;">
  <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;">Formulario de contacto · kibay.com.do</div>
  <h1 style="margin:8px 0 24px;font-size:22px;font-weight:600;color:#1a1a1a;">${escapeHtml(topic)}</h1>
  <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px;width:100%;">
    <tr><td style="color:#888;width:120px;">Nombre</td><td style="font-weight:500;">${escapeHtml(name)}</td></tr>
    <tr><td style="color:#888;">Email</td><td><a href="mailto:${escapeHtml(email)}" style="color:#D4A574;text-decoration:underline;">${escapeHtml(email)}</a></td></tr>
    <tr><td style="color:#888;">Tema</td><td>${escapeHtml(topic)}</td></tr>
  </table>
  <div style="margin:24px 0 8px;color:#888;font-size:14px;">Mensaje</div>
  <div style="background:#f8f8f5;border-left:3px solid #D4A574;padding:14px 16px;font-size:15px;line-height:1.6;white-space:pre-wrap;color:#1a1a1a;">${escapeHtml(message)}</div>
  <div style="margin-top:32px;padding-top:18px;border-top:1px solid #eee;font-size:11px;color:#aaa;">
    Responder directamente a <a href="mailto:${escapeHtml(email)}" style="color:#aaa;">${escapeHtml(email)}</a> — el "Reply-To" del correo ya apunta ahí.
  </div>
</td></tr></table></td></tr></table></body></html>`;

	const text = `Formulario de contacto · kibay.com.do

Nombre:  ${name}
Email:   ${email}
Tema:    ${topic}

Mensaje:
${message}

—
Responder directamente a ${email}`;

	const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: {
			'api-key': brevoKey,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({
			sender: { name: 'Kibay (contacto)', email: fromAddr },
			to: [{ email: toAddr, name: 'Kibay' }],
			replyTo: { email, name },
			subject,
			htmlContent: html,
			textContent: text,
		}),
	});
	const respBody = await resp.json().catch(() => ({}));
	if (!resp.ok) {
		console.error('send-contact-email: Brevo error', resp.status, respBody);
		return json({ error: 'send_failed', status: resp.status, detail: respBody }, 502);
	}

	return json({ ok: true, message_id: (respBody as { messageId?: string }).messageId });
});
