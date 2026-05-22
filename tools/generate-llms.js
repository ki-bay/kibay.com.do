#!/usr/bin/env node

/**
 * Generates public/llms.txt at build time following the llms.txt proposal
 * (https://llmstxt.org). The format is a hand-curated Markdown file that
 * gives LLMs and AI agents a flattened, semantically-tagged map of the
 * site so they can answer questions about Kibay without crawling the
 * whole SPA.
 *
 * Structure:
 *   # Title
 *   > One-sentence blockquote summary
 *   Paragraph(s) of context / interpretation rules
 *   ## Section — each item is "- [Title](path): description"
 *
 * Sections:
 *   - Core Products (static, hand-curated for our small catalog)
 *   - Experiences (static)
 *   - Story & Context (static)
 *   - Blog (dynamic — pulled from Supabase if reachable, else skipped)
 *   - Policies & Support (static)
 *
 * If Supabase is unreachable at build time (network blip, downtime),
 * the script falls back to a static-only file. Build never fails because
 * of llms.txt generation.
 */

import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://kibay.com.do';
const SUPABASE_URL =
	process.env.VITE_SUPABASE_URL ||
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	'https://bsnxwajuqkatrmgoqcnu.supabase.co';
const SUPABASE_ANON_KEY =
	process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
	process.env.VITE_SUPABASE_ANON_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	'';

const HEADER = `# Kibay Espumante

> Organic Caribbean sparkling wine from Ocoa Bay, Dominican Republic — passion-fruit and mango infusions, made in 250 ml cans and 750 ml bottles. The website also sells experiences at the Ocoa Bay winery (tastings, tours, Casa Club day passes) and runs a bilingual blog about Dominican wine culture.

Kibay (pronounced *ki-BAY*) is a small-batch wine brand from Bahía de Ocoa, Azua, Dominican Republic. The site is bilingual (Spanish / English) and sells direct-to-consumer in the Dominican Republic with all charges processed in Dominican pesos (DOP) via the CARDNET payment gateway. International customers can place orders too — their issuing bank handles the FX automatically. Prices may be displayed in USD as a reference but the actual charge is always DOP.

This file is a flattened sitemap intended for AI agents. Use the links below to retrieve specific information about products, experiences, the winery story, blog content, or policies. Routes ending in \`/cart\`, \`/checkout\`, \`/account\`, \`/login\`, \`/register\`, and anything under \`/admin\` or \`/dashboard\` are user-state-dependent and should be ignored by crawlers.
`;

const PRODUCTS_FALLBACK = `## Core Products

- [Shop — full catalog](/shop): Browse every Kibay wine and Ocoa Bay experience currently for sale, with prices in DOP and USD.
- [Ki-BAY Sparkling Can](/product/kibay-sparkling): 250 ml organic sparkling wine in passion-fruit / mango. Caribbean-style aperitif.
- [Kibay Tropical Wine](/product/kibay-wine): 750 ml bottle of Kibay's signature tropical sparkling wine.
- [Rosé](/product/rose): Dry rosé, 2026 vintage, made at Ocoa Bay vineyard in Azua, Dominican Republic.
- [French Colombard](/product/french-colombard): Bright dry white wine, 2026 vintage, Ocoa Bay terroir.
`;

const EXPERIENCES_FALLBACK = `## Experiences at Ocoa Bay

- [Complete Ocoa Bay Experience](/product/ocoa-bay-complete-experience): Tasting + winery tour + Casa Club access + 3-course organic menu. Around 4 hours on-site at Bahía de Ocoa.
- [Ocoa Bay Wine Tour](/product/ocoa-bay-wine-tour): 90-minute vineyard tour + tasting of the Kibay range.
- [Casa Club Day Pass](/product/ocoa-bay-casa-club-day-pass): Pool, restaurant, and beach access at Ocoa Bay's Casa Club (reservation required, minimum food/drink purchase).
`;

const STORY_SECTION = `## Story & Context

- [About Kibay](/about): Brand origin, founders, mission, and the story behind making sparkling wine in the Caribbean.
- [Vine & Barrel](/vine-and-barrel): The Ocoa Bay winery — climate, soil, varieties, harvest practices, and why we can grow vinifera grapes at 18° latitude.
- [Why cans?](/why-cans): The case for 250 ml aluminum cans for sparkling wine — freshness, portability, lower carbon footprint.
- [Whitepaper](/whitepaper): Deeper technical document on Kibay's organic winemaking process and Caribbean viticulture.
- [Enjoy — sunrise at Ocoa Bay](/enjoy/amanecer): Visual journal of mornings at the bay, framing how Kibay fits into Dominican coastal living.
- [Enjoy — among friends](/enjoy/amigos): Casual gatherings at Casa Club and how Kibay pairs with social meals.
- [Enjoy — Caribbean kitchen](/enjoy/cocina): Pairing notes for Kibay with traditional Dominican coastal dishes (fish, asopao, ceviche, light salads).
- [Enjoy — by the pool](/enjoy/piscina): Pool-side moments at Ocoa Bay's Casa Club.
- [Enjoy — quiet reading](/enjoy/lectura): Reflective afternoons at the winery — bottle pairings for solitude and slow time.
`;

const POLICIES_SECTION = `## Policies & Support

- [Contact](/contact): How to reach Kibay — email, phone, social, and Ocoa Bay address.
- [Shipping & Returns](/shipping-returns): Domestic Dominican Republic shipping rates, free-shipping thresholds, and 48-hour breakage guarantee.
- [Terms & Conditions](/terms): Pricing, payment, age verification, and order acceptance terms.
- [Privacy Policy](/privacy): What data we collect, how we use it, and the role of CARDNET as the card processor (Kibay never sees card numbers).
`;

const BLOG_FALLBACK = `## Blog

- [Kibay blog index](/blog): Latest articles on Kibay, Ocoa Bay, Dominican wine culture, and Caribbean food pairings (Spanish-language with English-language posts added over time).
`;

async function fetchSupabase(pathRel) {
	if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
	try {
		const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathRel}`, {
			headers: {
				apikey: SUPABASE_ANON_KEY,
				Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
			},
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

function escapeMd(s) {
	if (!s) return '';
	return String(s).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

async function buildProductsSection() {
	const rows = await fetchSupabase(
		'products?status=eq.published&type=eq.physical&select=slug,title_es,title_en,subtitle_es,subtitle_en&order=sort_order.asc',
	);
	if (!Array.isArray(rows) || rows.length === 0) return PRODUCTS_FALLBACK;
	const items = rows.map((p) => {
		const title = p.title_en || p.title_es;
		const subtitle = escapeMd(p.subtitle_en || p.subtitle_es || '');
		const desc = subtitle || 'Kibay wine — see product page for tasting notes, price (DOP/USD) and availability.';
		return `- [${escapeMd(title)}](/product/${p.slug}): ${desc}`;
	});
	return `## Core Products\n\n- [Shop — full catalog](/shop): Browse every Kibay wine and Ocoa Bay experience currently for sale, with prices in DOP and USD.\n${items.join('\n')}\n`;
}

async function buildExperiencesSection() {
	const rows = await fetchSupabase(
		'products?status=eq.published&type=eq.experience&select=slug,title_es,title_en,subtitle_es,subtitle_en&order=sort_order.asc',
	);
	if (!Array.isArray(rows) || rows.length === 0) return EXPERIENCES_FALLBACK;
	const items = rows.map((p) => {
		const title = p.title_en || p.title_es;
		const subtitle = escapeMd(p.subtitle_en || p.subtitle_es || '');
		const desc = subtitle || 'Reservation-based experience at Ocoa Bay vineyard — see page for inclusions and pricing.';
		return `- [${escapeMd(title)}](/product/${p.slug}): ${desc}`;
	});
	return `## Experiences at Ocoa Bay\n\n${items.join('\n')}\n`;
}

async function buildBlogSection() {
	const rows = await fetchSupabase(
		'blog_posts?published=eq.true&select=slug,title,description&order=created_at.desc&limit=30',
	);
	if (!Array.isArray(rows) || rows.length === 0) return BLOG_FALLBACK;
	const items = rows.map((p) => {
		const title = escapeMd(p.title || p.slug);
		const desc = escapeMd((p.description || '').slice(0, 200)) ||
			'Article on Kibay, Ocoa Bay, or Dominican wine culture.';
		return `- [${title}](/blog/${p.slug}): ${desc}`;
	});
	return `## Blog\n\n- [Blog index](/blog): Browse all Kibay articles — Spanish-language posts on Ocoa Bay, Caribbean wine, and Dominican food pairings.\n${items.join('\n')}\n`;
}

async function main() {
	let products = PRODUCTS_FALLBACK;
	let experiences = EXPERIENCES_FALLBACK;
	let blog = BLOG_FALLBACK;
	try {
		[products, experiences, blog] = await Promise.all([
			buildProductsSection().catch(() => PRODUCTS_FALLBACK),
			buildExperiencesSection().catch(() => EXPERIENCES_FALLBACK),
			buildBlogSection().catch(() => BLOG_FALLBACK),
		]);
	} catch {
		// Use fallbacks already assigned.
	}

	const body = [
		HEADER,
		products,
		experiences,
		STORY_SECTION,
		blog,
		POLICIES_SECTION,
		`---\n\nGenerated at ${new Date().toISOString()} from ${SITE_URL}. Source-of-truth product and blog data is pulled from Supabase at build time.\n`,
	].join('\n');

	const outputPath = path.join(process.cwd(), 'public', 'llms.txt');
	const outDir = path.dirname(outputPath);
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
	fs.writeFileSync(outputPath, body, 'utf8');
	process.stdout.write(`llms.txt generated (${body.length} bytes)\n`);
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
	main().catch((err) => {
		console.error('llms.txt generation failed:', err.message);
		process.exit(0); // soft-fail; build continues
	});
}
