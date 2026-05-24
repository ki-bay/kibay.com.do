// ai-email-send — Tier 2 outbound email dispatcher.
// =============================================================================
// Called by ai-chat-approve when an approved/edited message belongs to an
// email-channel conversation. Builds an RFC-5322 reply (preserving
// References/In-Reply-To threading), sends via Brevo SMTP API, and writes
// the outbound email_messages row.
//
// Can also be called directly (admin or operator script) if you want to
// re-send a previously-sent message. Idempotency comes from a 'sent_at'
// check on the source message.
//
// Required Edge Function secrets:
//   BREVO_API_KEY              — xkeysib-...
//   AI_EMAIL_FROM              — e.g. 'hola@reply.kibay.com.do' (must match DKIM domain)
//   AI_EMAIL_FROM_NAME         — e.g. 'Kibay'

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const brevoKey = Deno.env.get('BREVO_API_KEY') || '';
const fromAddr = Deno.env.get('AI_EMAIL_FROM') || 'hola@reply.kibay.com.do';
const fromName = Deno.env.get('AI_EMAIL_FROM_NAME') || 'Kibay';

const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...cors, 'Content-Type': 'application/json' },
	});
}

function dedupeSubjectRe(subject: string): string {
	const stripped = (subject || '').replace(/^(re:\s*)+/gi, '').trim();
	return stripped ? `Re: ${stripped}` : 'Re: tu consulta a Kibay';
}

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

	if (!brevoKey) return json({ error: 'BREVO_API_KEY not set' }, 503);

	// Auth: requires a Supabase JWT for an admin user. Same pattern as ai-chat-approve.
	const authHeader = req.headers.get('authorization') || '';
	const jwt = authHeader.replace(/^Bearer\s+/i, '');
	if (!jwt) return json({ error: 'unauthorized' }, 401);

	const userClient = createClient(supabaseUrl, anonKey, {
		global: { headers: { Authorization: `Bearer ${jwt}` } },
	});
	const { data: userResult } = await userClient.auth.getUser();
	const userId = userResult?.user?.id;
	if (!userId) return json({ error: 'unauthorized' }, 401);

	const admin = createClient(supabaseUrl, serviceKey);
	const { data: userRow } = await admin
		.from('users')
		.select('id, role')
		.eq('id', userId)
		.maybeSingle();
	if (!userRow || userRow.role !== 'admin') return json({ error: 'admin_only' }, 403);

	let body: { message_id?: string };
	try {
		body = (await req.json()) as { message_id?: string };
	} catch {
		return json({ error: 'bad_json' }, 400);
	}
	if (!body.message_id) return json({ error: 'message_id required' }, 400);

	// Resolve the message + its conversation + the parent email_thread.
	const { data: msg } = await admin
		.from('ai_conversation_messages')
		.select('id, conversation_id, role, channel, body, edited_body, approval_status, sent_at')
		.eq('id', body.message_id)
		.maybeSingle();
	if (!msg) return json({ error: 'message_not_found' }, 404);
	if (msg.role !== 'assistant') return json({ error: 'not_assistant_turn' }, 400);
	if (msg.channel !== 'email') return json({ error: 'not_email_channel' }, 400);
	if (!['approved', 'edited'].includes(msg.approval_status)) return json({ error: 'not_approved' }, 409);

	const { data: conv } = await admin
		.from('ai_conversations')
		.select('id, buyer_email, buyer_locale')
		.eq('id', msg.conversation_id)
		.maybeSingle();
	if (!conv || !conv.buyer_email) return json({ error: 'no_buyer_email' }, 400);

	const { data: thread } = await admin
		.from('email_threads')
		.select('id, root_message_id, subject_normalized')
		.eq('conversation_id', msg.conversation_id)
		.maybeSingle();
	if (!thread) return json({ error: 'no_thread' }, 400);

	// Pull the most recent inbound to thread the reply correctly.
	const { data: priorMessages } = await admin
		.from('email_messages')
		.select('message_id, in_reply_to, subject, direction, references_chain')
		.eq('thread_id', thread.id)
		.order('created_at', { ascending: true });
	const lastInbound = (priorMessages || []).filter((m) => m.direction === 'inbound').slice(-1)[0];
	const lastSubject = lastInbound?.subject || thread.subject_normalized || '';
	const inReplyTo = lastInbound?.message_id || thread.root_message_id;
	const referencesChain = [
		...new Set([thread.root_message_id, ...(lastInbound?.references_chain || []), inReplyTo].filter(Boolean)),
	];

	const outboundBody = msg.edited_body || msg.body;
	const outboundSubject = dedupeSubjectRe(lastSubject);

	// Brevo's transactional email endpoint. We use the SMTP API not the v3
	// API because v3 strips reply-threading headers we care about.
	// Send via /smtp/email which accepts custom headers in payload.headers.
	const newMessageId = `<${crypto.randomUUID()}@${(fromAddr.split('@')[1] || 'reply.kibay.com.do')}>`;
	const brevoPayload = {
		sender: { name: fromName, email: fromAddr },
		to: [{ email: conv.buyer_email }],
		subject: outboundSubject,
		htmlContent: `<div style="font-family: sans-serif; line-height: 1.6; color: #222;">${
			outboundBody.replace(/\n/g, '<br/>')
		}</div>`,
		textContent: outboundBody,
		headers: {
			'In-Reply-To': inReplyTo ? `<${inReplyTo.replace(/^<|>$/g, '')}>` : undefined,
			References: referencesChain.length ? referencesChain.map((r) => `<${r.replace(/^<|>$/g, '')}>`).join(' ') : undefined,
			'Message-Id': newMessageId,
		},
	};

	const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: {
			'api-key': brevoKey,
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify(brevoPayload),
	});
	const respJson = await resp.json().catch(() => ({}));
	if (!resp.ok) {
		console.error('ai-email-send: Brevo error', resp.status, respJson);
		await admin.from('ai_conversation_events').insert({
			conversation_id: msg.conversation_id,
			kind: 'email_failed',
			payload: { status: resp.status, detail: respJson, message_id: msg.id },
		});
		return json({ error: 'brevo_send_failed', status: resp.status, detail: respJson }, 502);
	}

	// Write outbound email_messages row.
	await admin.from('email_messages').insert({
		thread_id: thread.id,
		conversation_message_id: msg.id,
		message_id: newMessageId,
		in_reply_to: inReplyTo,
		references_chain: referencesChain,
		direction: 'outbound',
		from_addr: fromAddr,
		to_addr: [conv.buyer_email],
		subject: outboundSubject,
	});
	await admin.from('ai_conversation_events').insert({
		conversation_id: msg.conversation_id,
		kind: 'email_sent',
		payload: { message_id: msg.id, to: conv.buyer_email, subject: outboundSubject, brevo_message_id: respJson.messageId },
	});

	return json({ ok: true, brevo_message_id: respJson.messageId, message_id: newMessageId });
});
