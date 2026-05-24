// ai-email-inbound — Tier 2 email inbound handler.
// =============================================================================
// Called by the Cloudflare Email Worker (workers/email-inbound/) every time
// a customer emails `hola@reply.kibay.com.do` (or any `*@reply.kibay.com.do`).
// The Worker parses RFC-5322 with postal-mime, HMAC-signs the JSON payload,
// then POSTs here.
//
// We:
//   1. Verify the HMAC (so only our Worker can call this).
//   2. Idempotency-check on message_id (CF retries on 5xx).
//   3. Threading: match In-Reply-To against existing email_messages →
//      use that conversation; else create a new email_threads + ai_conversations.
//   4. Insert the user turn + email_messages row.
//   5. Draft a reply via Claude with the email-channel system prompt.
//   6. Save the draft as approval_status='pending'. Admin reviews in
//      /admin/ai-inbox and approval triggers outbound send via Brevo.
//
// Required Edge Function secrets:
//   AI_EMAIL_INBOUND_SECRET   — HMAC secret shared with the CF Email Worker
//   ANTHROPIC_API_KEY         — same key Tier 1 uses
//   AI_EMAIL_REPLY_DOMAIN     — e.g. 'reply.kibay.com.do' (used for from-address validation)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const hmacSecret = Deno.env.get('AI_EMAIL_INBOUND_SECRET') || '';
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') || '';
const replyDomain = Deno.env.get('AI_EMAIL_REPLY_DOMAIN') || 'reply.kibay.com.do';
const model = Deno.env.get('AI_CHAT_MODEL') || 'claude-sonnet-4-6';

const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-aho-signature',
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...cors, 'Content-Type': 'application/json' },
	});
}

async function verifyHmac(body: string, signature: string, secret: string): Promise<boolean> {
	if (!signature || !secret) return false;
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const expectedBuf = await crypto.subtle.sign('HMAC', key, enc.encode(body));
	const expected = Array.from(new Uint8Array(expectedBuf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	// Timing-safe compare (constant-time over min length).
	if (expected.length !== signature.length) return false;
	let diff = 0;
	for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
	return diff === 0;
}

function normalizeSubject(subject: string): string {
	return (subject || '')
		.replace(/^(re:|fwd:|fw:)\s*/gi, '')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

function detectLocale(text: string): 'es' | 'en' {
	// Naive sniff — count Spanish indicator words. Sufficient for the prompt
	// builder which just needs to know reply language.
	const lower = (text || '').toLowerCase();
	const esHits = (lower.match(/\b(hola|gracias|saludos|por favor|cuánto|cuándo|envío|precio|disponib|reserva|degustaci|pedido|consulta)\b/g) || []).length;
	const enHits = (lower.match(/\b(hello|hi|thanks|thank you|please|how|when|shipping|price|available|reservation|tasting|order|inquiry)\b/g) || []).length;
	return esHits >= enHits ? 'es' : 'en';
}

type InboundPayload = {
	to: string;
	from: string;
	messageId: string;
	inReplyTo?: string | null;
	references?: string[];
	subject?: string;
	bodyText?: string;
	bodyHtml?: string;
	headers?: Record<string, unknown>;
	dkim?: boolean;
	spf?: boolean;
	dmarc?: boolean;
};

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

	if (!hmacSecret || !anthropicKey) return json({ error: 'not_configured' }, 503);

	const rawBody = await req.text();
	const signature = req.headers.get('x-aho-signature') || '';
	const verified = await verifyHmac(rawBody, signature, hmacSecret);
	if (!verified) return json({ error: 'bad_signature' }, 401);

	let payload: InboundPayload;
	try {
		payload = JSON.parse(rawBody) as InboundPayload;
	} catch {
		return json({ error: 'bad_json' }, 400);
	}

	if (!payload.messageId || !payload.from) return json({ error: 'missing_fields' }, 400);

	const admin = createClient(supabaseUrl, serviceKey);

	// 1. Idempotency — Cloudflare retries on non-2xx, so dedup on message_id.
	{
		const { data: dup } = await admin
			.from('email_messages')
			.select('id')
			.eq('message_id', payload.messageId)
			.maybeSingle();
		if (dup) return json({ ok: true, duplicate: true });
	}

	// 2. Threading. Match by In-Reply-To first; subject+sender fallback second.
	const buyerEmail = (payload.from || '').toLowerCase();
	const subjectNorm = normalizeSubject(payload.subject || '');
	let threadId: string | null = null;
	let conversationId: string | null = null;

	if (payload.inReplyTo) {
		const { data: existingMsg } = await admin
			.from('email_messages')
			.select('thread_id, email_threads(conversation_id)')
			.eq('message_id', payload.inReplyTo)
			.maybeSingle();
		if (existingMsg) {
			threadId = existingMsg.thread_id;
			conversationId = (existingMsg.email_threads as any)?.conversation_id ?? null;
		}
	}
	if (!threadId && subjectNorm) {
		const { data: existingThread } = await admin
			.from('email_threads')
			.select('id, conversation_id')
			.eq('subject_normalized', subjectNorm)
			.eq('buyer_email', buyerEmail)
			.maybeSingle();
		if (existingThread) {
			threadId = existingThread.id;
			conversationId = existingThread.conversation_id;
		}
	}

	const locale = detectLocale(`${payload.subject || ''} ${payload.bodyText || ''}`);

	if (!conversationId) {
		// New conversation.
		const { data: newConv, error: convErr } = await admin
			.from('ai_conversations')
			.insert({
				channel: 'email',
				buyer_email: buyerEmail,
				buyer_locale: locale,
				// Session token unused for email-channel but the column is NOT NULL.
				// Use a synthetic identifier the Edge Function recognizes.
				buyer_session_token: `email:${crypto.randomUUID().replace(/-/g, '')}`,
			})
			.select('id')
			.single();
		if (convErr || !newConv) {
			console.error('ai-email-inbound: conv insert failed', convErr);
			return json({ error: 'create_failed' }, 500);
		}
		conversationId = newConv.id;
		await admin.from('ai_conversation_events').insert({
			conversation_id: conversationId,
			kind: 'started',
			payload: { channel: 'email', from: buyerEmail, subject: payload.subject || null },
		});

		const { data: newThread } = await admin
			.from('email_threads')
			.insert({
				conversation_id: conversationId,
				root_message_id: payload.messageId,
				subject_normalized: subjectNorm || null,
				buyer_email: buyerEmail,
			})
			.select('id')
			.single();
		threadId = newThread?.id || null;
	}

	if (!threadId) {
		console.error('ai-email-inbound: no thread id after resolution');
		return json({ error: 'thread_failed' }, 500);
	}

	// 3. Insert user turn (spine row first, then email_messages side row).
	const userBody = (payload.bodyText && payload.bodyText.trim()) || (payload.bodyHtml || '').replace(/<[^>]+>/g, '').trim() || '(empty body)';
	const { data: userMsg, error: userMsgErr } = await admin
		.from('ai_conversation_messages')
		.insert({
			conversation_id: conversationId,
			role: 'user',
			channel: 'email',
			body: userBody.slice(0, 8000), // cap for prompt safety
			approval_status: 'auto_sent',
			sent_at: new Date().toISOString(),
		})
		.select('id')
		.single();
	if (userMsgErr || !userMsg) return json({ error: 'spine_insert_failed' }, 500);

	const { error: emailMsgErr } = await admin.from('email_messages').insert({
		thread_id: threadId,
		conversation_message_id: userMsg.id,
		message_id: payload.messageId,
		in_reply_to: payload.inReplyTo || null,
		references_chain: payload.references || [],
		direction: 'inbound',
		from_addr: buyerEmail,
		to_addr: [payload.to],
		subject: payload.subject || null,
		dkim_pass: payload.dkim ?? null,
		spf_pass: payload.spf ?? null,
		dmarc_pass: payload.dmarc ?? null,
		raw_headers: payload.headers ?? null,
	});
	if (emailMsgErr) console.error('ai-email-inbound: email_messages insert failed', emailMsgErr);

	await admin.from('ai_conversation_events').insert({
		conversation_id: conversationId,
		kind: 'message_user',
		payload: { channel: 'email', length: userBody.length },
	});

	// 4. Draft reply via Claude (email-channel system prompt).
	const systemPrompt = buildEmailSystemPrompt({ locale, buyerEmail });

	// Pull conversation history (same approach as web chat).
	const { data: history } = await admin
		.from('ai_conversation_messages')
		.select('role, body, edited_body, approval_status')
		.eq('conversation_id', conversationId)
		.order('created_at', { ascending: true })
		.limit(30);
	const messages = (history ?? [])
		.filter((m) => m.role === 'user' || (m.role === 'assistant' && ['approved', 'edited', 'auto_sent'].includes(m.approval_status)))
		.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.edited_body || m.body }));

	const startedAt = Date.now();
	let draft = '';
	let inputTokens = 0;
	let outputTokens = 0;
	let errorCode: string | null = null;
	try {
		const resp = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'x-api-key': anthropicKey,
				'anthropic-version': '2023-06-01',
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model,
				max_tokens: 1024,
				system: systemPrompt,
				messages,
			}),
		});
		const respJson = await resp.json();
		if (!resp.ok) {
			errorCode = `anthropic_${resp.status}`;
			console.error('ai-email-inbound: anthropic error', resp.status, respJson);
			draft = locale === 'es'
				? 'Gracias por escribirnos — el equipo Kibay revisará tu mensaje y te responderá pronto.'
				: 'Thanks for reaching out — the Kibay team will review your message and reply shortly.';
		} else {
			draft = (respJson.content || [])
				.filter((c: any) => c.type === 'text')
				.map((c: any) => c.text)
				.join('\n');
			inputTokens = respJson.usage?.input_tokens ?? 0;
			outputTokens = respJson.usage?.output_tokens ?? 0;
		}
	} catch (e) {
		errorCode = 'fetch_error';
		console.error('ai-email-inbound: fetch failed', e);
		draft = locale === 'es'
			? 'Gracias por escribirnos — el equipo Kibay revisará tu mensaje y te responderá pronto.'
			: 'Thanks for reaching out — the Kibay team will review your message and reply shortly.';
	}

	const { data: logRow } = await admin
		.from('ai_generation_log')
		.insert({
			purpose: 'email_draft',
			model,
			input_tokens: inputTokens,
			output_tokens: outputTokens,
			estimated_cost_usd_cents: estimateCostCents(inputTokens, outputTokens),
			latency_ms: Date.now() - startedAt,
			error_code: errorCode,
		})
		.select('id')
		.single();

	// 5. Persist assistant draft as pending.
	const { error: draftErr } = await admin.from('ai_conversation_messages').insert({
		conversation_id: conversationId,
		role: 'assistant',
		channel: 'email',
		body: draft,
		approval_status: 'pending',
		ai_generation_log_id: logRow?.id ?? null,
	});
	if (draftErr) console.error('ai-email-inbound: draft insert failed', draftErr);
	await admin.from('ai_conversation_events').insert({
		conversation_id: conversationId,
		kind: 'draft_pending',
		payload: { channel: 'email' },
	});

	return json({ ok: true, conversation_id: conversationId });
});

function estimateCostCents(inputTokens: number, outputTokens: number): number {
	const usd = (inputTokens / 1_000_000) * 3.0 + (outputTokens / 1_000_000) * 15.0;
	return Math.round(usd * 100);
}

function buildEmailSystemPrompt({ locale, buyerEmail }: { locale: 'es' | 'en'; buyerEmail: string }): string {
	const inSpanish = locale === 'es';
	return [
		inSpanish
			? `Eres el asistente virtual de Kibay, una bodega de vinos orgánicos caribeños de Ocoa Bay, República Dominicana. Estás respondiendo un email de ${buyerEmail}. Cada respuesta es revisada por una persona del equipo Kibay antes de enviarse.`
			: `You are the virtual assistant for Kibay, an organic Caribbean winery from Ocoa Bay, Dominican Republic. You are drafting an email reply to ${buyerEmail}. Every reply is reviewed by a Kibay team member before sending.`,
		inSpanish
			? `Formato: cuerpo de email en HTML simple. Abre con "Hola" + nombre si lo conoces. Cierra con "Saludos cordiales,\\nEquipo Kibay\\n${replyDomain.replace('reply.', 'https://')}". Mantén el tono profesional pero cálido. 4-8 oraciones típicamente.`
			: `Format: simple HTML email body. Open with "Hi" + name if known. Close with "Best regards,\\nThe Kibay Team\\n${replyDomain.replace('reply.', 'https://')}". Keep it professional but warm. 4-8 sentences typically.`,
		inSpanish
			? `NUNCA respondas asuntos legales, médicos sobre alcohol, pedidos al por mayor (escala a info@kibay.com.do) o condiciones comerciales especiales. Esos temas requieren intervención humana.`
			: `NEVER answer legal questions, medical questions about alcohol, wholesale requests (escalate to info@kibay.com.do), or custom commercial terms. Those require human handling.`,
		inSpanish
			? `Datos operativos (úsalos textualmente):\n- Envíos: RD$250 estándar (1-3 días hábiles); gratis sobre RD$5,000.\n- Email principal: info@kibay.com.do\n- Viñedo: Bahía de Ocoa, Km 6½ Hatillo, Azua.\n- Tienda online: https://kibay.com.do/shop\n- Reservas + visitas: https://kibay.com.do/vine-and-barrel`
			: `Operational facts (use verbatim):\n- Shipping: RD$250 standard (1-3 business days); free over RD$5,000.\n- Primary email: info@kibay.com.do\n- Vineyard: Ocoa Bay, Km 6½ Hatillo, Azua.\n- Online store: https://kibay.com.do/shop\n- Reservations + visits: https://kibay.com.do/vine-and-barrel`,
	].join('\n\n');
}
