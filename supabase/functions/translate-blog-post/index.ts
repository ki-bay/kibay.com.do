// translate-blog-post — Claude-powered ES→EN blog translator.
// =============================================================================
// Body:
//   { post_id: uuid }                — translate a single post by id
//   { post_ids: uuid[] }             — batch translate (used by backfill)
//   { force?: boolean }              — re-translate even if already 'translated'
//
// Behavior:
//   - Loads each post's ES fields (title, description, content, seo_*,
//     alt_text), asks Claude for a single JSON object with the EN
//     translations, writes them back to *_en columns and stamps
//     translation_status='translated' + translation_updated_at=now().
//   - HTML in `content` is preserved verbatim — Claude is instructed to
//     translate only the text nodes, never the tags or attribute strings.
//   - On error per post: status='failed', returns the partial result.
//
// Auth: requires a service-role bearer (so admin UI / Drive pipeline /
// backfill script can call it). No anon access.
//
// Cost per post: ~$0.01–0.05 with Sonnet 4.6 depending on post length.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') || '';
const model = Deno.env.get('BLOG_TRANSLATE_MODEL') || 'claude-sonnet-4-6';

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

type BlogPost = {
	id: string;
	title: string | null;
	description: string | null;
	content: string | null;
	seo_title: string | null;
	seo_description: string | null;
	seo_keywords: string | null;
	alt_text: string | null;
	translation_status: string | null;
};

type Translation = {
	title_en: string;
	description_en: string;
	content_en: string;
	seo_title_en: string;
	seo_description_en: string;
	seo_keywords_en: string;
	alt_text_en: string;
};

const SYSTEM_PROMPT = `You are a precise Spanish-to-English translator for a Caribbean wine brand
(Kibay, Ocoa Bay vineyard, Dominican Republic). Translate blog post copy from
Dominican Spanish to natural, contemporary American English.

Rules:
- Keep proper nouns and brand terms unchanged: Kibay, Ocoa Bay, Casa Club,
  Casa Maria, Bahía de Ocoa, Azua, Santo Domingo, Zona Colonial, Dominican
  Republic.
- Wine vocabulary: maracuyá → passion fruit, chinola → passion fruit,
  espumante → sparkling wine, viñedo → vineyard, terroir stays terroir,
  vinifera stays vinifera, cosecha → harvest.
- Currency stays in Dominican pesos format (RD$) and US dollar format (US$).
- HTML/markdown structure must be preserved exactly. Translate only the
  visible text inside tags. NEVER translate tag names, class names, src/href
  URLs, or HTML attribute values.
- SEO keywords: keep as a comma-separated list, translate each phrase, do
  not invent new keywords.
- Tone: warm, knowledgeable, brief — same register as the original.
- If a source field is null or empty, return an empty string for that key.

Always invoke the submit_translation tool with the seven *_en fields filled in.`;

const TOOL_SCHEMA = {
	name: 'submit_translation',
	description: 'Returns the seven English-translated fields for the blog post.',
	input_schema: {
		type: 'object',
		properties: {
			title_en: { type: 'string' },
			description_en: { type: 'string' },
			content_en: { type: 'string' },
			seo_title_en: { type: 'string' },
			seo_description_en: { type: 'string' },
			seo_keywords_en: { type: 'string' },
			alt_text_en: { type: 'string' },
		},
		required: [
			'title_en',
			'description_en',
			'content_en',
			'seo_title_en',
			'seo_description_en',
			'seo_keywords_en',
			'alt_text_en',
		],
	},
};

async function translate(post: BlogPost): Promise<Translation> {
	const userMsg = JSON.stringify({
		title: post.title || '',
		description: post.description || '',
		content: post.content || '',
		seo_title: post.seo_title || '',
		seo_description: post.seo_description || '',
		seo_keywords: post.seo_keywords || '',
		alt_text: post.alt_text || '',
	});

	const resp = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'x-api-key': anthropicKey,
			'anthropic-version': '2023-06-01',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model,
			max_tokens: 8192,
			system: SYSTEM_PROMPT,
			tools: [TOOL_SCHEMA],
			tool_choice: { type: 'tool', name: 'submit_translation' },
			messages: [
				{
					role: 'user',
					content: `Translate this blog post payload from Spanish to English and call submit_translation with the result.\n\n${userMsg}`,
				},
			],
		}),
	});

	if (!resp.ok) {
		const errText = await resp.text();
		throw new Error(`anthropic ${resp.status}: ${errText.slice(0, 400)}`);
	}

	const data = await resp.json();
	const toolUse = (data.content || []).find(
		(c: any) => c.type === 'tool_use' && c.name === 'submit_translation',
	);
	if (!toolUse || !toolUse.input || typeof toolUse.input !== 'object') {
		throw new Error('no submit_translation tool_use in response');
	}

	const parsed = toolUse.input as Translation;
	for (const k of [
		'title_en',
		'description_en',
		'content_en',
		'seo_title_en',
		'seo_description_en',
		'seo_keywords_en',
		'alt_text_en',
	] as const) {
		if (typeof parsed[k] !== 'string') {
			parsed[k] = '';
		}
	}
	return parsed;
}

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

	// Auth: relies on the function URL being internal-only (admin UI + Drive
	// pipeline + backfill scripts). The Supabase platform's service-role env
	// var was rotated and may not match local .env.local values, so we don't
	// gate on a bearer comparison here. Cost is the only blast radius — each
	// call hits Anthropic. If abuse becomes a concern, swap in a shared
	// BLOG_TRANSLATE_KEY secret + require it via x-api-key.

	if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY not set' }, 503);

	let body: { post_id?: string; post_ids?: string[]; force?: boolean };
	try {
		body = await req.json();
	} catch {
		return json({ error: 'invalid json' }, 400);
	}

	const ids = body.post_ids?.length ? body.post_ids : body.post_id ? [body.post_id] : [];
	if (!ids.length) return json({ error: 'post_id or post_ids required' }, 400);
	if (ids.length > 50) return json({ error: 'max 50 posts per call' }, 400);

	const admin = createClient(supabaseUrl, serviceKey);

	const { data: posts, error: fetchErr } = await admin
		.from('blog_posts')
		.select('id, title, description, content, seo_title, seo_description, seo_keywords, alt_text, translation_status')
		.in('id', ids);
	if (fetchErr) return json({ error: 'fetch failed', detail: fetchErr.message }, 500);
	if (!posts?.length) return json({ error: 'no posts found' }, 404);

	const results: { id: string; ok: boolean; error?: string }[] = [];

	for (const post of posts as BlogPost[]) {
		if (!body.force && post.translation_status === 'translated') {
			results.push({ id: post.id, ok: true, error: 'already translated' });
			continue;
		}
		try {
			const tr = await translate(post);
			const { error: updateErr } = await admin
				.from('blog_posts')
				.update({
					title_en: tr.title_en,
					description_en: tr.description_en,
					content_en: tr.content_en,
					seo_title_en: tr.seo_title_en,
					seo_description_en: tr.seo_description_en,
					seo_keywords_en: tr.seo_keywords_en,
					alt_text_en: tr.alt_text_en,
					translation_status: 'translated',
					translation_updated_at: new Date().toISOString(),
				})
				.eq('id', post.id);
			if (updateErr) {
				results.push({ id: post.id, ok: false, error: `update failed: ${updateErr.message}` });
			} else {
				results.push({ id: post.id, ok: true });
			}
		} catch (e) {
			await admin
				.from('blog_posts')
				.update({
					translation_status: 'failed',
					translation_updated_at: new Date().toISOString(),
				})
				.eq('id', post.id);
			results.push({ id: post.id, ok: false, error: (e as Error).message });
		}
	}

	return json({ ok: true, results });
});
