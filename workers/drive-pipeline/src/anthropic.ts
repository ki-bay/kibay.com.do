// Anthropic Claude Vision → structured blog post draft.

export interface GeneratedPost {
	title_es: string;
	title_en: string;
	slug: string;
	body_es: string;
	body_en: string;
	alt_text: string;
	caption_facebook: string;
	caption_instagram: string;
	caption_linkedin: string;
	seo_description_es: string;
	seo_description_en: string;
	tags: string[];
}

const SYSTEM_PROMPT = `You are writing for Kibay — a Caribbean sparkling wine brand from the Dominican Republic. Kibay grows grapes at Ocoa Bay (Azua region) and produces organic sparkling wine in cans and bottles, plus mango and passion-fruit infused variants. Voice: warm, sensory, professional, never hyperbolic. Bilingual (Spanish primary, English equal).

You receive (1) a photograph and (2) the photo's filename, often renamed by the owner to hint at subject — e.g. "ocoa-bay-harvest-2025.jpg", "kibay-mango-can-launch.jpg".

Generate a publishable blog post draft (about 600–900 words per language) connecting the visual to the brand. Do not fabricate specific facts (dates, awards, named people, quotes) unless they are clearly visible or strongly implied by the filename. Prefer concrete sensory description over generic marketing language.

Output ONLY valid JSON matching this exact shape — no markdown fences, no prose before or after:

{
  "title_es": "Spanish title, max 70 chars",
  "title_en": "English title, max 70 chars",
  "slug": "kebab-case-english-slug-max-50-chars",
  "body_es": "Markdown body in Spanish, paragraphs separated by blank lines, may use ## subheadings",
  "body_en": "Markdown body in English, same conventions",
  "alt_text": "Descriptive alt text for the image, English, max 125 chars",
  "caption_facebook": "Engaging Facebook caption, 2-3 sentences, no hashtags, English",
  "caption_instagram": "Instagram caption with 5-8 relevant hashtags at the end, English",
  "caption_linkedin": "Professional LinkedIn caption, 1 paragraph, English",
  "seo_description_es": "Spanish meta description, max 155 chars",
  "seo_description_en": "English meta description, max 155 chars",
  "tags": ["3-6 relevant lowercase tags"]
}`;

export async function generateBlogFromImage(
	apiKey: string,
	model: string,
	imageBytes: ArrayBuffer,
	imageMimeType: string,
	filename: string,
): Promise<GeneratedPost> {
	const imageB64 = arrayBufferToBase64(imageBytes);
	const body = {
		model,
		max_tokens: 4096,
		system: SYSTEM_PROMPT,
		messages: [
			{
				role: 'user',
				content: [
					{
						type: 'image',
						source: { type: 'base64', media_type: imageMimeType, data: imageB64 },
					},
					{ type: 'text', text: `Filename hint: "${filename}"\n\nReturn the JSON now.` },
				],
			},
		],
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
	const json = (await r.json()) as { content: Array<{ type: string; text: string }> };
	const text = json.content.find((c) => c.type === 'text')?.text || '';
	const cleaned = text
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/```\s*$/i, '')
		.trim();
	try {
		return JSON.parse(cleaned) as GeneratedPost;
	} catch {
		throw new Error(`Anthropic returned non-JSON: ${text.slice(0, 300)}`);
	}
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
	const bytes = new Uint8Array(buf);
	let bin = '';
	const chunk = 0x8000;
	for (let i = 0; i < bytes.length; i += chunk) {
		bin += String.fromCharCode.apply(
			null,
			Array.from(bytes.subarray(i, i + chunk)),
		);
	}
	return btoa(bin);
}
