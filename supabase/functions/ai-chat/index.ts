// ai-chat — Tier 1 web-chat endpoint.
// =============================================================================
// Anon-callable. The chat widget POSTs the visitor's message here; the
// function creates/extends a conversation, calls Claude to draft a reply,
// classifies it, persists as approval_status='pending'. The DRAFT IS NOT
// returned to the buyer — that's the HITL gate. The buyer's widget polls
// `ai-chat-poll` to discover approved replies.
//
// Auth model: anon. The buyer identifies via `session_token` (random UUID
// stored in their localStorage). The token is checked against the
// conversation row on every subsequent call so a different buyer can't read
// or extend a foreign conversation.
//
// Required Edge Function secrets:
//   ANTHROPIC_API_KEY      — Claude API key (sk-ant-...)
//   AI_CHAT_MODEL          — optional, defaults to claude-sonnet-4-6
//
// Cost per turn: ~$0.01-0.05 USD with Sonnet 4.6 at typical chat length.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') || '';
const model = Deno.env.get('AI_CHAT_MODEL') || 'claude-sonnet-4-6';

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

type ChatBody = {
	conversation_id?: string | null;
	session_token?: string;
	message?: string;
	locale?: 'es' | 'en';
	context_product_id?: string | null;
	context_path?: string | null;
};

// Hardcoded operational facts — single source of truth so the AI cannot drift
// from what the rest of the system enforces. Reference: skill gotcha #16
// (AHO's 60→90 day breach).
const KIBAY_FACTS = {
	shipping_dop: 'Envío estándar dentro de República Dominicana: RD$250 (1–3 días hábiles). Gratis en pedidos sobre RD$5,000.',
	shipping_en: 'Standard shipping within the Dominican Republic: RD$250 (1–3 business days). Free over RD$5,000.',
	contact_email: 'info@kibay.com.do',
	whatsapp: '+1 (809) 000-0000',
	winery_location: 'Bahía de Ocoa, Km 6½ Hatillo, Azua, República Dominicana',
	winery_location_en: 'Ocoa Bay, Km 6½ Hatillo, Azua, Dominican Republic',
	visit_url: 'https://kibay.com.do/vine-and-barrel',
	owner_name: 'Kibay',
};

function buildSystemPrompt(args: {
	locale: 'es' | 'en';
	focusProduct?: { title: string; description: string; price_text: string; slug: string } | null;
	products: Array<{ title: string; subtitle?: string | null; description: string; price_text: string; slug: string }>;
}): string {
	const { locale, focusProduct, products } = args;
	const inSpanish = locale === 'es';

	const role = inSpanish
		? `Eres el asistente virtual de Kibay, una bodega de vinos orgánicos caribeños de Ocoa Bay, República Dominicana. Cada respuesta tuya es revisada por una persona del equipo Kibay antes de enviarse al cliente — puedes ser claro y directo en tu borrador.`
		: `You are the virtual assistant for Kibay, an organic Caribbean winery from Ocoa Bay, Dominican Republic. Every reply you draft is reviewed by a Kibay team member before it reaches the customer — feel free to be clear and direct.`;

	const tone = inSpanish
		? `Tono: cálido, conocedor, breve. 2–4 oraciones por respuesta. Iguala la formalidad del cliente. Si saluda informal, responde informal.`
		: `Tone: warm, knowledgeable, brief. 2–4 sentences per reply. Match the customer's formality.`;

	const format = inSpanish
		? `Formato: texto plano con enlaces en [etiqueta](url) solamente. NO uses encabezados markdown (#, ##). NO envuelvas URLs en negrita (**https://...**) — rompe el parser. NO inventes datos, precios ni fechas que no estén en el contexto.`
		: `Format: plain text with links as [label](url) only. DO NOT use markdown headers (#, ##). DO NOT bold-wrap URLs (**https://...**) — breaks the parser. DO NOT invent facts, prices, or dates not in the context.`;

	const refusals = inSpanish
		? `NUNCA contestes estas preguntas — escala al equipo:
- Consultas legales o de cumplimiento
- Pedidos al por mayor o distribución (responde: "Por favor escribe a ${KIBAY_FACTS.contact_email}")
- Términos comerciales personalizados
- Preguntas médicas sobre alcohol`
		: `NEVER answer these — escalate to the team:
- Legal or compliance questions
- Wholesale or distribution requests (reply: "Please email ${KIBAY_FACTS.contact_email}")
- Custom commercial terms
- Medical questions about alcohol`;

	const facts = inSpanish
		? `Datos operativos (úsalos textualmente, no inventes):
- Envíos: ${KIBAY_FACTS.shipping_dop}
- Email: ${KIBAY_FACTS.contact_email}
- Ubicación viñedo: ${KIBAY_FACTS.winery_location}
- Visitas y reservas: ${KIBAY_FACTS.visit_url}`
		: `Operational facts (use verbatim, do not invent):
- Shipping: ${KIBAY_FACTS.shipping_en}
- Email: ${KIBAY_FACTS.contact_email}
- Winery location: ${KIBAY_FACTS.winery_location_en}
- Visits & bookings: ${KIBAY_FACTS.visit_url}`;

	const focus = focusProduct
		? inSpanish
			? `\n\nEl cliente está mirando este producto específicamente:
<producto_actual>
Título: ${focusProduct.title}
Descripción: ${focusProduct.description}
Precio: ${focusProduct.price_text}
URL: https://kibay.com.do/product/${focusProduct.slug}
</producto_actual>`
			: `\n\nThe customer is currently viewing this specific product:
<focus_product>
Title: ${focusProduct.title}
Description: ${focusProduct.description}
Price: ${focusProduct.price_text}
URL: https://kibay.com.do/product/${focusProduct.slug}
</focus_product>`
		: '';

	const catalog = products.length
		? inSpanish
			? `\n\nCatálogo completo de Kibay:\n<catalogo>\n${products
					.map(
						(p) =>
							`• ${p.title}${p.subtitle ? ` — ${p.subtitle}` : ''}\n  ${p.description.slice(0, 240)}\n  Precio: ${p.price_text}\n  URL: https://kibay.com.do/product/${p.slug}`,
					)
					.join('\n')}\n</catalogo>`
			: `\n\nFull Kibay catalog:\n<catalog>\n${products
					.map(
						(p) =>
							`• ${p.title}${p.subtitle ? ` — ${p.subtitle}` : ''}\n  ${p.description.slice(0, 240)}\n  Price: ${p.price_text}\n  URL: https://kibay.com.do/product/${p.slug}`,
					)
					.join('\n')}\n</catalog>`
		: '';

	return [role, tone, format, refusals, facts, focus, catalog].join('\n\n');
}

// Lightweight risk classifier — regex-only, no second LLM call.
// Flags drafts the operator should treat as higher-stakes.
function classify(userText: string, draft: string): { confidence: number; intent: string; risk_flags: string[] } {
	const risk: string[] = [];
	const combined = (userText + ' ' + draft).toLowerCase();

	if (/\b(refund|reembolso|devoluci[oó]n|chargeback)\b/.test(combined)) risk.push('refund');
	if (/\b(lawyer|abogado|legal|sue|demand|demand[ao])\b/.test(combined)) risk.push('legal');
	if (/\b(allerg|aleg[ée]rg|gluten|sulfite|sulfito)\b/.test(combined)) risk.push('health');
	if (/\b(wholesale|distributor|distribuidor|mayoreo|al por mayor|export)\b/.test(combined)) risk.push('wholesale');
	if (/\b(complain|complaint|queja|reclamo|terrible|awful|disgusting)\b/.test(combined)) risk.push('complaint');
	if (/\b(price.{0,12}match|match.{0,12}price|descuento especial|special discount)\b/.test(combined)) risk.push('pricing');

	// Intent inference (rough).
	let intent = 'general';
	if (/\b(ship|env[ií]o|delivery|entrega)\b/.test(combined)) intent = 'shipping';
	else if (/\b(price|precio|cost|cuesta|cu[aá]nto)\b/.test(combined)) intent = 'pricing_info';
	else if (/\b(stock|inventar|disponib|available)\b/.test(combined)) intent = 'availability';
	else if (/\b(visit|visita|tour|reserva|booking|tasting|degustaci)\b/.test(combined)) intent = 'visit_request';
	else if (/\b(allerg|aleg[ée]rg|vegan|kosher|halal|sulfite|gluten)\b/.test(combined)) intent = 'dietary';

	// Lower confidence when draft is very short (likely incomplete) or hit risk.
	let confidence = 0.85;
	if (draft.length < 40) confidence = 0.55;
	if (risk.length > 0) confidence = Math.min(confidence, 0.6);

	return { confidence, intent, risk_flags: risk };
}

// Estimate Anthropic cost given token counts. Snapshot the pricing at call
// time so historical rollups survive future price changes.
function estimateCostCents(modelId: string, inputTokens: number, outputTokens: number): number {
	// Sonnet 4.6 indicative pricing (Nov 2025–): $3/M input, $15/M output.
	// Tweak if you upgrade the model.
	const inputPerMTok = 3.0;
	const outputPerMTok = 15.0;
	const usd = (inputTokens / 1_000_000) * inputPerMTok + (outputTokens / 1_000_000) * outputPerMTok;
	return Math.round(usd * 100);
}

async function loadKnowledge(admin: SupabaseClient, contextProductId: string | null, locale: 'es' | 'en') {
	// Pull all published purchasable products with their default variant for pricing.
	const { data: products } = await admin
		.from('products')
		.select('id, slug, title_es, title_en, subtitle_es, subtitle_en, description_es, description_en, product_variants(price_usd_cents, sale_price_usd_cents, price_dop_cents, sale_price_dop_cents)')
		.eq('status', 'published')
		.eq('purchasable', true)
		.order('sort_order')
		.limit(20);

	const formatPrice = (variants: any[]): string => {
		if (!variants?.length) return '—';
		const v = variants[0];
		const dop = (v.sale_price_dop_cents ?? v.price_dop_cents) / 100;
		const usd = (v.sale_price_usd_cents ?? v.price_usd_cents) / 100;
		return locale === 'es'
			? `RD$${dop.toLocaleString('es-DO')} / US$${usd.toFixed(2)}`
			: `US$${usd.toFixed(2)} / RD$${dop.toLocaleString('es-DO')}`;
	};

	const list = (products ?? []).map((p: any) => ({
		title: locale === 'es' ? p.title_es : p.title_en,
		subtitle: locale === 'es' ? p.subtitle_es : p.subtitle_en,
		description: (locale === 'es' ? p.description_es : p.description_en) ?? '',
		price_text: formatPrice(p.product_variants),
		slug: p.slug,
	}));

	let focusProduct = null;
	if (contextProductId) {
		const product = (products ?? []).find((p: any) => p.id === contextProductId);
		if (product) {
			focusProduct = {
				title: locale === 'es' ? product.title_es : product.title_en,
				description: (locale === 'es' ? product.description_es : product.description_en) ?? '',
				price_text: formatPrice((product as any).product_variants),
				slug: product.slug,
			};
		}
	}

	return { products: list, focusProduct };
}

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

	if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 503);

	let body: ChatBody;
	try {
		body = (await req.json()) as ChatBody;
	} catch {
		return json({ error: 'Invalid JSON' }, 400);
	}

	const message = (body.message || '').trim();
	const sessionToken = body.session_token || '';
	const locale: 'es' | 'en' = body.locale === 'en' ? 'en' : 'es';
	if (!message) return json({ error: 'message required' }, 400);
	if (message.length > 4000) return json({ error: 'message too long' }, 400);
	if (!/^[a-zA-Z0-9_-]{16,128}$/.test(sessionToken)) return json({ error: 'session_token invalid' }, 400);

	const admin = createClient(supabaseUrl, serviceKey);

	// 1. Resolve / create the conversation row.
	let conversationId = body.conversation_id || null;
	if (conversationId) {
		const { data: conv } = await admin
			.from('ai_conversations')
			.select('id, buyer_session_token, status')
			.eq('id', conversationId)
			.maybeSingle();
		if (!conv || conv.buyer_session_token !== sessionToken) {
			return json({ error: 'conversation_not_found' }, 404);
		}
		if (conv.status === 'resolved' || conv.status === 'abandoned') {
			// Re-open so a returning buyer can continue.
			await admin.from('ai_conversations').update({ status: 'open' }).eq('id', conversationId);
		}
	} else {
		const { data: newConv, error: insertErr } = await admin
			.from('ai_conversations')
			.insert({
				buyer_session_token: sessionToken,
				buyer_locale: locale,
				context_product_id: body.context_product_id ?? null,
				context_path: body.context_path ?? null,
			})
			.select('id')
			.single();
		if (insertErr || !newConv) {
			console.error('ai-chat: failed to create conversation', insertErr);
			return json({ error: 'create_failed' }, 500);
		}
		conversationId = newConv.id;
		await admin.from('ai_conversation_events').insert({
			conversation_id: conversationId,
			kind: 'started',
			payload: { locale, context_product_id: body.context_product_id, context_path: body.context_path },
		});
	}

	// 2. Persist the user turn.
	const { error: userTurnErr } = await admin.from('ai_conversation_messages').insert({
		conversation_id: conversationId,
		role: 'user',
		body: message,
		approval_status: 'auto_sent', // user messages don't need approval
		sent_at: new Date().toISOString(),
	});
	if (userTurnErr) {
		console.error('ai-chat: user turn insert failed', userTurnErr);
		return json({ error: 'persist_failed' }, 500);
	}
	await admin.from('ai_conversation_events').insert({
		conversation_id: conversationId,
		kind: 'message_user',
		payload: { length: message.length },
	});

	// 3. Pull conversation history (last 20 visible turns).
	const { data: history } = await admin
		.from('ai_conversation_messages')
		.select('role, body, edited_body, approval_status, created_at')
		.eq('conversation_id', conversationId)
		.order('created_at', { ascending: true })
		.limit(40);

	const messages = (history ?? [])
		.filter((m) => {
			if (m.role === 'user') return true;
			if (m.role === 'assistant' && (m.approval_status === 'approved' || m.approval_status === 'edited' || m.approval_status === 'auto_sent')) return true;
			return false;
		})
		.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.edited_body || m.body }));

	// 4. Build knowledge + system prompt.
	const { products, focusProduct } = await loadKnowledge(admin, body.context_product_id ?? null, locale);
	const systemPrompt = buildSystemPrompt({ locale, focusProduct, products });

	// 5. Call Anthropic.
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
			console.error('ai-chat: anthropic error', resp.status, respJson);
			draft = locale === 'es'
				? 'Lo siento, hubo un problema generando la respuesta. El equipo Kibay te responderá pronto.'
				: 'Sorry, there was a problem generating a reply. The Kibay team will get back to you shortly.';
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
		console.error('ai-chat: fetch to anthropic failed', e);
		draft = locale === 'es'
			? 'Lo siento, hubo un problema generando la respuesta. El equipo Kibay te responderá pronto.'
			: 'Sorry, there was a problem generating a reply. The Kibay team will get back to you shortly.';
	}

	// 6. Log the call (cost + tokens snapshot).
	const { data: logRow } = await admin
		.from('ai_generation_log')
		.insert({
			purpose: 'chat_draft',
			model,
			input_tokens: inputTokens,
			output_tokens: outputTokens,
			estimated_cost_usd_cents: estimateCostCents(model, inputTokens, outputTokens),
			latency_ms: Date.now() - startedAt,
			error_code: errorCode,
		})
		.select('id')
		.single();

	// 7. Classify + persist the assistant draft as pending.
	const classification = classify(message, draft);
	await admin.from('ai_conversation_messages').insert({
		conversation_id: conversationId,
		role: 'assistant',
		body: draft,
		approval_status: 'pending',
		confidence: classification.confidence,
		intent: classification.intent,
		risk_flags: classification.risk_flags,
		ai_generation_log_id: logRow?.id ?? null,
	});
	await admin.from('ai_conversation_events').insert({
		conversation_id: conversationId,
		kind: 'draft_pending',
		payload: {
			intent: classification.intent,
			risk_flags: classification.risk_flags,
			confidence: classification.confidence,
		},
	});

	return json({
		conversation_id: conversationId,
		// Buyer doesn't see the draft yet — that's the whole point of HITL.
		pending: true,
	});
});
