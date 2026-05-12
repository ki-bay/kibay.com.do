// Anthropic Claude Vision → richly structured bilingual blog post draft.
// Two parallel calls (ES + EN) to fit Workers Free 30s waitUntil budget.

export interface GeneratedFAQ {
	question: string;
	answer: string;
}

export interface GeneratedDataCallout {
	title: string;
	items: Record<string, string>;
}

export interface GeneratedPullQuote {
	text: string;
	author: string;
	role: string;
}

export interface GeneratedLangPart {
	title: string;
	body_html: string;
	seo_description: string;
	faqs: GeneratedFAQ[];
	data_callout: GeneratedDataCallout;
	pull_quote: GeneratedPullQuote;
}

export interface GeneratedExtras {
	slug: string;
	alt_text: string;
	tags: string[];
	caption_facebook: string;
	caption_instagram: string;
	caption_linkedin: string;
	reading_time_min: number;
}

export interface GeneratedPost extends GeneratedExtras {
	en: GeneratedLangPart;
	es: GeneratedLangPart;
}

const ECOSYSTEM_LINKS = `KIBAY ECOSYSTEM — every mention of these properties MUST be a clickable link:

External (use target="_blank" rel="noopener noreferrer" on every external link):
- Ocoa Bay vineyard visits / reservations: https://ocoabay.com/reservacion/
- Casa Maria flagship store in Zona Colonial, Santo Domingo: https://casalamariazonacolonial.com
- Casa Maria on Google Maps: https://www.google.com/maps/search/?api=1&query=Casa+Maria+Zona+Colonial+Santo+Domingo

Internal (relative URLs, no target attribute):
- Kibay online shop: /shop
- Kibay Sparkling product: /kibay-sparkling
- Kibay Wine product: /kibay-wine
- About Kibay: /about
- White Paper: /whitepaper`;

const STRUCTURE_RULES = `${ECOSYSTEM_LINKS}

ROUTE-TO-GLASS NARRATIVE: weave a thread from the marine breeze at Ocoa Bay through the historic stone walls of Casa Maria in Zona Colonial, Santo Domingo, to the wine in the reader's glass. The Kibay ecosystem is Vineyard → Boutique → Online Shop, and the article should make the reader feel they can step into any one of them.

MANDATORY STRUCTURE (650-750 words total, every section tight and specific):

- ## Narrative Hook (≈100 words): open with a vivid sensory scene — either dawn at Ocoa Bay (salt-tinged Caribbean breeze, dew on vines) OR golden-hour light hitting Casa Maria's stone facade in Zona Colonial. End with a transition into terroir.

- ## The Terroir of Ocoa Bay (≈150 words): hard-data section. MUST include coordinates **18.2°N, 70.5°W**, elevation **45 m**, soil **limestone-rich alluvial**, and the tropical maritime climate. Embed the data callout (see HTML below) inside this section. End with a CTA sentence linking to https://ocoabay.com/reservacion/ ("Book a visit to the vineyard" / "Reserva una visita a la viña").

- ## Process & Tropical Infusions (≈150 words): organic winemaking, hand-harvest, mango and passion-fruit infusions, lees aging. End with the inline CTA HTML block (see below) pointing to /shop.

- ## Casa Maria — Zona Colonial (≈150 words): introduce the Casa Maria flagship store in Santo Domingo's Zona Colonial as the city home of Kibay, where the wine sits alongside curated Caribbean lifestyle goods. Tie back to the vineyard (Ocoa → Zona Colonial → glass). MUST contain two contextual external links: one to https://casalamariazonacolonial.com (the store) and one to the Google Maps location URL above.

- ## Tasting Notes & FAQ (≈150 words): one short paragraph profiling the sparkling lineup (citrus + green apple base; mango / passion-fruit infusions; serving temp), then render the 3 FAQs as <h3>Q</h3><p>A</p> blocks. REQUIRED FAQs (MUST include these two, plus one more of your choice):
  1. "Where can I buy Kibay in Santo Domingo?" — answer must mention Casa Maria with the casalamariazonacolonial.com link
  2. "Can I stay at or visit the vineyard?" — answer must direct to https://ocoabay.com/reservacion/
  The 3 FAQs MUST also appear in the structured 'faqs' field for FAQPage JSON-LD generation.

- One-line transitional sentence into the final multi-CTA, followed by this exact HTML block:
  <ul class="cta-multi">
    <li><a href="/shop" class="cta-button cta-primary">Shop Kibay online →</a></li>
    <li><a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer" class="cta-button">Reserve a vineyard visit →</a></li>
    <li><a href="https://casalamariazonacolonial.com" target="_blank" rel="noopener noreferrer" class="cta-button">Visit Casa Maria, Zona Colonial →</a></li>
  </ul>
  (In Spanish version, translate the link text: "Compra Kibay en línea", "Reserva una visita a la viña", "Visítanos en Casa Maria, Zona Colonial".)

EMBEDDABLE HTML STRUCTURES (use these EXACTLY inside body_html):

Data callout (terroir card, place inside Terroir section):
<aside class="data-callout">
  <h4>Terroir at a glance</h4>
  <dl>
    <dt>Location</dt><dd>Ocoa Bay, Azua, Dominican Republic</dd>
    <dt>Coordinates</dt><dd>18.2°N, 70.5°W</dd>
    <dt>Elevation</dt><dd>45 m</dd>
    <dt>Soil</dt><dd>Limestone-rich alluvial</dd>
    <dt>Climate</dt><dd>Tropical maritime</dd>
  </dl>
</aside>

Inline CTA (end of Process section):
<div class="cta-block cta-inline">
  <p>Bring Ocoa Bay home in a bottle.</p>
  <a href="/shop" class="cta-button">Shop Kibay →</a>
</div>

LINK QUOTA: body_html MUST include AT MINIMUM these 5 contextual links (more is fine):
  1. https://ocoabay.com/reservacion/ — at end of Terroir section
  2. /shop or /kibay-sparkling — at end of Process section
  3. https://casalamariazonacolonial.com — in Casa Maria section
  4. Google Maps URL for Casa Maria — in Casa Maria section
  5. (Plus the 3 links in the final multi-CTA list)

ABSOLUTE NO-FABRICATION RULE: do not invent specific awards, certifications, dates, or attributed quotes from real people. If unsure, say "our organic practices" instead of "certified organic". Use generic placeholder names only when necessary.

LENGTH: body_html must be 650-750 words (4-5 min read). Every sentence must add concrete information; cut filler.

FORMAT: output ONLY valid JSON. No markdown fences. No commentary. No \`\`\`json wrapping.`;

function multiImageNote(count: number): string {
	if (count <= 1) return '';
	const list = Array.from({ length: count }, (_, i) => `{{IMAGE_${i + 1}}}`).join(', ');
	return `\n\nMULTI-IMAGE: ${count} images attached in order. Embed them inline in body_html using the literal placeholder tokens ${list} — exactly one occurrence per token. The worker substitutes each token with a <figure><img src="..." alt="..."><figcaption>...</figcaption></figure> block at publish time. {{IMAGE_1}} is the hero (also used as the featured/og image) — place it near the top, ideally inside or just after the Narrative Hook section. Spread the remaining placeholders across distinct sections (Terroir, Process, Casa Maria) so each image earns its place in the narrative; do NOT cluster them all in one section. Each placeholder must appear on its own line. Do NOT wrap placeholders in any HTML tags.`;
}

function langPromptEn(filename: string, imageCount: number): string {
	return `Write the ENGLISH version of a publishable Kibay blog post based on the attached image${imageCount > 1 ? 's' : ''}.${multiImageNote(imageCount)}

Brand: Kibay — organic Caribbean sparkling wine from Ocoa Bay, Dominican Republic (Azua region). Cans and bottles; mango and passion-fruit infusions. Voice: warm, sensory, professional, journalistic — not marketing copy.

Filename hint (owner-renamed for subject): "${filename}"

${STRUCTURE_RULES}

Output this exact JSON shape:

{
  "title": "English title, max 70 chars, includes brand or primary keyword",
  "slug": "kebab-case-english-slug-max-50-chars",
  "body_html": "<p>Full HTML article, 1200-1500 words, all sections per the structure rules, embedded callouts/quotes/CTAs/FAQs in body, plus internal links</p>",
  "seo_description": "Unique meta description, 150-160 chars, includes primary keyword + click incentive",
  "alt_text": "Hero image alt text, 15-20 words, descriptive, includes brand keyword",
  "tags": ["3-6 lowercase kebab-case tags"],
  "caption_facebook": "Storytelling FB caption, 230-270 words, 3-5 short paragraphs. Sensory hook in para 1, weave the Vineyard (Ocoa Bay) → Boutique (Casa Maria Zona Colonial) → Glass arc, soft closing CTA. NO hashtags. The worker auto-appends a 'Read more: <link>' line, so do NOT include the blog URL yourself.",
  "caption_instagram": "IG caption, 200-240 words of storytelling, then ONE blank line, then 6-9 hashtags space-separated (mix popular + niche, e.g. #organicwine #dominicanrepublic #ocoabay #sparklingwine #caribbeanlife). Strong hook in first 125 chars (visible before 'more' fold). Mention @kibaywine, Ocoa Bay, Casa Maria naturally. Warm sensory voice.",
  "caption_linkedin": "LinkedIn caption, 250-290 words, 4-6 short paragraphs separated by blank lines (LinkedIn renders \\n\\n as paragraph breaks). Professional storytelling tone: vineyard at Ocoa Bay, organic process, flagship at Casa Maria Zona Colonial, with a soft CTA at the end. NO hashtags.",
  "faqs": [
    {"question": "Q1", "answer": "A1 (25-40 words)"},
    {"question": "Q2", "answer": "A2"},
    {"question": "Q3", "answer": "A3"}
  ],
  "data_callout": {"title": "Terroir at a glance", "items": {"Location": "...", "Latitude": "...", "Climate": "...", "Soil": "...", "Notes": "..."}},
  "pull_quote": {"text": "Single quote sentence", "author": "Name", "role": "Role at Kibay"},
  "reading_time_min": 4
}

The data_callout, pull_quote, and faqs fields MUST be reflected in body_html as the embedded HTML structures shown in the rules. The structured fields are for JSON-LD schema generation downstream; the body_html is what readers see.`;
}

function langPromptEs(filename: string, imageCount: number): string {
	return `Escribe la versión EN ESPAÑOL de un artículo de blog publicable para Kibay basado en la${imageCount > 1 ? 's ' + imageCount + ' imágenes adjuntas' : ' imagen adjunta'}.${multiImageNote(imageCount)}

Marca: Kibay — espumante caribeño orgánico de Ocoa Bay, República Dominicana (provincia Azua). Latas y botellas; infusiones de mango y maracuyá. Voz: cálida, sensorial, profesional, periodística — no copy de marketing.

Pista del nombre de archivo (renombrado por el dueño para indicar el tema): "${filename}"

REGLAS DE ESTRUCTURA (mismas reglas que la versión EN — 650-750 palabras, narrativa "Del terruño a la copa" que conecta Ocoa Bay → Casa Maria en Zona Colonial → la copa del lector):

- ## Gancho narrativo (≈100 palabras): escena sensorial al amanecer en Ocoa Bay o luz dorada sobre la fachada de piedra de Casa Maria en Zona Colonial.
- ## El Terroir de Ocoa Bay (≈150 palabras): datos duros — coordenadas 18.2°N, 70.5°W, elevación 45 m, suelo aluvial calcáreo, clima tropical marítimo. Incluir <aside class="data-callout"> al final. Cerrar con una oración-CTA enlazando a https://ocoabay.com/reservacion/ con target="_blank" rel="noopener noreferrer".
- ## Proceso e Infusiones Tropicales (≈150 palabras): elaboración orgánica, vendimia manual, infusiones de mango/maracuyá, crianza sobre lías. Terminar con <div class="cta-block cta-inline"> enlazando a /shop.
- ## Casa Maria — Zona Colonial (≈150 palabras): boutique principal en Santo Domingo, hogar urbano de Kibay junto a productos caribeños curados. Conectar de regreso al viñedo. DEBE incluir dos enlaces externos: uno a https://casalamariazonacolonial.com y otro al URL de Google Maps mencionado arriba (ambos con target="_blank" rel="noopener noreferrer").
- ## Notas de Cata y FAQ (≈150 palabras): perfil breve de la línea espumante, luego 3 FAQs como h3+p. Las 3 FAQs DEBEN incluir: "¿Dónde puedo comprar Kibay en Santo Domingo?" (respuesta menciona Casa Maria con su enlace) y "¿Puedo visitar el viñedo?" (respuesta apunta a Ocoa Bay reservaciones). La tercera es libre.
- Oración de transición + bloque CTA final exacto:
  <ul class="cta-multi">
    <li><a href="/shop" class="cta-button cta-primary">Compra Kibay en línea →</a></li>
    <li><a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer" class="cta-button">Reserva una visita a la viña →</a></li>
    <li><a href="https://casalamariazonacolonial.com" target="_blank" rel="noopener noreferrer" class="cta-button">Visítanos en Casa Maria, Zona Colonial →</a></li>
  </ul>

CUOTA DE ENLACES: mínimo 5 enlaces contextuales en body_html (los 4 ecosistémicos arriba + los 3 del CTA final).
LONGITUD: 650-750 palabras en body_html.
- NO inventes premios, certificaciones, fechas o citas atribuidas a personas reales. Usa nombres claramente genéricos (ej. Carlos Mendoza). Si no estás seguro de una certificación, di "nuestras prácticas orgánicas" en vez de "certificado orgánico".
- HTML embebido exactamente como en las reglas EN — mismas clases CSS: data-callout, pull-quote, cta-block, cta-inline, cta-end, cta-button, cta-primary.

Output ÚNICAMENTE este JSON, sin fences ni comentarios:

{
  "title": "Título en español, máx 70 caracteres",
  "body_html": "<p>Artículo HTML completo, 1200-1500 palabras, todas las secciones</p>",
  "seo_description": "Meta descripción única en español, 150-160 caracteres",
  "faqs": [
    {"question": "P1", "answer": "R1 (25-40 palabras)"},
    {"question": "P2", "answer": "R2"},
    {"question": "P3", "answer": "R3"}
  ],
  "data_callout": {"title": "El terroir en breve", "items": {"Ubicación": "...", "Latitud": "...", "Clima": "...", "Suelo": "...", "Notas": "..."}},
  "pull_quote": {"text": "Cita en español", "author": "Nombre", "role": "Cargo en Kibay"}
}`;
}

interface ClaudeMessagesResponse {
	content: Array<{ type: string; text: string }>;
	error?: { message: string };
}

export interface ImageInput {
	bytes: ArrayBuffer;
	mimeType: string;
}

async function callClaude(
	apiKey: string,
	model: string,
	images: ImageInput[],
	userText: string,
): Promise<string> {
	const content: Array<unknown> = images.map((img) => ({
		type: 'image',
		source: { type: 'base64', media_type: img.mimeType, data: arrayBufferToBase64(img.bytes) },
	}));
	content.push({ type: 'text', text: userText });

	const body = {
		model,
		max_tokens: 5000,
		messages: [{ role: 'user', content }],
	};
	const r = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-api-key': apiKey,
			'anthropic-version': '2023-06-01',
		},
		body: JSON.stringify(body),
	});
	if (!r.ok) throw new Error(`Anthropic API failed: ${r.status} ${await r.text()}`);
	const json = (await r.json()) as ClaudeMessagesResponse;
	if (json.error) throw new Error(`Anthropic error: ${json.error.message}`);
	return json.content.find((c) => c.type === 'text')?.text || '';
}

function parseJsonStrict<T>(text: string, label: string): T {
	const cleaned = text
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/```\s*$/i, '')
		.trim();
	try {
		return JSON.parse(cleaned) as T;
	} catch (e) {
		throw new Error(`${label} returned non-JSON: ${text.slice(0, 300)}`);
	}
}

export async function generateBlogFromImage(
	apiKey: string,
	model: string,
	images: ImageInput[],
	filename: string,
): Promise<GeneratedPost> {
	const imageCount = images.length;
	const [enText, esText] = await Promise.all([
		callClaude(apiKey, model, images, langPromptEn(filename, imageCount)),
		callClaude(apiKey, model, images, langPromptEs(filename, imageCount)),
	]);

	const en = parseJsonStrict<{
		title: string;
		slug: string;
		body_html: string;
		seo_description: string;
		alt_text: string;
		tags: string[];
		caption_facebook: string;
		caption_instagram: string;
		caption_linkedin: string;
		faqs: GeneratedFAQ[];
		data_callout: GeneratedDataCallout;
		pull_quote: GeneratedPullQuote;
		reading_time_min: number;
	}>(enText, 'Claude EN');

	const es = parseJsonStrict<{
		title: string;
		body_html: string;
		seo_description: string;
		faqs: GeneratedFAQ[];
		data_callout: GeneratedDataCallout;
		pull_quote: GeneratedPullQuote;
	}>(esText, 'Claude ES');

	return {
		slug: en.slug,
		alt_text: en.alt_text,
		tags: en.tags,
		caption_facebook: en.caption_facebook,
		caption_instagram: en.caption_instagram,
		caption_linkedin: en.caption_linkedin,
		reading_time_min: en.reading_time_min,
		en: {
			title: en.title,
			body_html: en.body_html,
			seo_description: en.seo_description,
			faqs: en.faqs,
			data_callout: en.data_callout,
			pull_quote: en.pull_quote,
		},
		es: {
			title: es.title,
			body_html: es.body_html,
			seo_description: es.seo_description,
			faqs: es.faqs,
			data_callout: es.data_callout,
			pull_quote: es.pull_quote,
		},
	};
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let bin = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
	}
	return btoa(bin);
}
