#!/usr/bin/env node
/**
 * Generate public/sitemap.xml at build time.
 * Vite then copies public/* into dist/, so CF Pages serves it as a real
 * static XML file with content-type application/xml (Googlebot-friendly).
 *
 * Pulls dynamic content from Supabase via the anon REST API. Falls back to
 * static routes only if Supabase is unreachable.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.join(projectRoot, 'public', 'sitemap.xml');

const SITE_URL = process.env.VITE_SITE_URL || 'https://kibay.com.do';
// IndexNow key file lives at public/<key>.txt (its content is just the key
// itself) — that's the whole "account": no login, no OAuth, just a random
// value proving control of the domain. Bing/Yandex/Seznam/Naver all honor
// api.indexnow.org, so one ping here reaches DuckDuckGo's results too (it
// sources organic results from Bing).
const INDEXNOW_KEY = '1b5d3a2defd3db4fffda1d3761feb61d';
const SUPABASE_URL =
	process.env.VITE_SUPABASE_URL ||
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	'';
const SUPABASE_KEY =
	process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
	process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
	process.env.VITE_SUPABASE_ANON_KEY ||
	'';

// Static routes (App.jsx public surfaces). Excludes auth, cart, checkout, admin.
const STATIC_ROUTES = [
	{ path: '/', priority: '1.0', changefreq: 'weekly' },
	{ path: '/shop', priority: '0.9', changefreq: 'daily' },
	{ path: '/about', priority: '0.7', changefreq: 'monthly' },
	{ path: '/contact', priority: '0.5', changefreq: 'monthly' },
	{ path: '/why-cans', priority: '0.6', changefreq: 'monthly' },
	{ path: '/vine-and-barrel', priority: '0.8', changefreq: 'weekly' },
	{ path: '/mango', priority: '0.7', changefreq: 'monthly' },
	{ path: '/passion-fruit', priority: '0.7', changefreq: 'monthly' },
	{ path: '/whitepaper', priority: '0.5', changefreq: 'yearly' },
	{ path: '/kibay-sparkling', priority: '0.8', changefreq: 'weekly' },
	{ path: '/kibay-wine', priority: '0.8', changefreq: 'weekly' },
	{ path: '/blog', priority: '0.7', changefreq: 'weekly' },
	{ path: '/terms', priority: '0.3', changefreq: 'yearly' },
	{ path: '/privacy', priority: '0.3', changefreq: 'yearly' },
	{ path: '/shipping-returns', priority: '0.3', changefreq: 'yearly' },
];

// SEO keyword-cluster landing pages — bilingual slugs (EN + ES URLs render
// the same component). Each topic gets two <url> entries with reciprocal
// hreflang; x-default points at the EN slug.
const SEO_LANDING_ROUTES = [
	{ en: '/wine-tasting-near-me', es: '/cata-de-vinos-cerca-de-mi', priority: '0.8', changefreq: 'monthly' },
	{ en: '/wine-tasting-dominican-republic', es: '/cata-de-vinos-republica-dominicana', priority: '0.8', changefreq: 'monthly' },
	{ en: '/passion-fruit-mango-wine', es: '/vino-de-maracuya-y-mango', priority: '0.9', changefreq: 'monthly' },
	{ en: '/tropical-dominican-wine', es: '/vino-tropical-dominicano', priority: '0.8', changefreq: 'monthly' },
];

const xmlEscape = (s) =>
	String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

async function fetchTable(table, query) {
	if (!SUPABASE_URL || !SUPABASE_KEY) return [];
	const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
	try {
		const resp = await fetch(url, {
			headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
		});
		if (!resp.ok) {
			console.warn(`sitemap: ${table} fetch failed ${resp.status}`);
			return [];
		}
		return resp.json();
	} catch (e) {
		console.warn(`sitemap: ${table} fetch threw`, e.message);
		return [];
	}
}

function urlEntry({ loc, lastmod, changefreq = 'monthly', priority = '0.5' }) {
	const lm = lastmod ? `\n    <lastmod>${xmlEscape(lastmod.slice(0, 10))}</lastmod>` : '';
	// hreflang signals — single-URL bilingual site
	const alt = `
    <xhtml:link rel="alternate" hreflang="es" href="${xmlEscape(loc)}" />
    <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(loc)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(loc)}" />`;
	return `  <url>
    <loc>${xmlEscape(loc)}</loc>${lm}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${alt}
  </url>`;
}

// Bilingual entry for pages that have distinct EN + ES slugs (the SEO
// landing cluster). Emits both URLs with reciprocal hreflang; x-default
// points at the EN slug. `current` decides which URL is the <loc>.
function bilingualUrlEntry({ enPath, esPath, lastmod, changefreq, priority, current }) {
	const lm = lastmod ? `\n    <lastmod>${xmlEscape(lastmod.slice(0, 10))}</lastmod>` : '';
	const loc = current === 'es' ? `${SITE_URL}${esPath}` : `${SITE_URL}${enPath}`;
	const alt = `
    <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(SITE_URL + enPath)}" />
    <xhtml:link rel="alternate" hreflang="es" href="${xmlEscape(SITE_URL + esPath)}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(SITE_URL + enPath)}" />`;
	return `  <url>
    <loc>${xmlEscape(loc)}</loc>${lm}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${alt}
  </url>`;
}

// Best-effort ping to IndexNow's aggregator so Bing (and by extension
// DuckDuckGo/Yahoo, which source from Bing's index) picks up changes without
// waiting for a crawl. Never blocks or fails the build — a dead network or a
// 4xx here just means the next scheduled crawl finds it instead, same as
// before this existed.
async function pingIndexNow(urls) {
	if (!urls.length) return;
	try {
		const resp = await fetch('https://api.indexnow.org/indexnow', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json; charset=utf-8' },
			body: JSON.stringify({
				host: new URL(SITE_URL).host,
				key: INDEXNOW_KEY,
				keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
				urlList: urls,
			}),
		});
		console.log(`indexnow: submitted ${urls.length} URLs — ${resp.status}`);
	} catch (e) {
		console.warn('indexnow: ping failed (non-fatal):', e.message);
	}
}

async function main() {
	const today = new Date().toISOString();
	const urls = [];

	// Static routes
	const entries = STATIC_ROUTES.map((r) => {
		urls.push(`${SITE_URL}${r.path}`);
		return urlEntry({
			loc: `${SITE_URL}${r.path}`,
			lastmod: today,
			changefreq: r.changefreq,
			priority: r.priority,
		});
	});

	// SEO landing cluster — emit EN and ES URLs as a pair with reciprocal hreflang.
	for (const r of SEO_LANDING_ROUTES) {
		urls.push(`${SITE_URL}${r.en}`, `${SITE_URL}${r.es}`);
		entries.push(
			bilingualUrlEntry({
				enPath: r.en,
				esPath: r.es,
				lastmod: today,
				changefreq: r.changefreq,
				priority: r.priority,
				current: 'en',
			}),
		);
		entries.push(
			bilingualUrlEntry({
				enPath: r.en,
				esPath: r.es,
				lastmod: today,
				changefreq: r.changefreq,
				priority: r.priority,
				current: 'es',
			}),
		);
	}

	// Products: published only, by slug.
	const products = await fetchTable(
		'products',
		'select=slug,updated_at&status=eq.published',
	);
	for (const p of products) {
		if (!p.slug) continue;
		urls.push(`${SITE_URL}/product/${p.slug}`);
		entries.push(
			urlEntry({
				loc: `${SITE_URL}/product/${p.slug}`,
				lastmod: p.updated_at || today,
				changefreq: 'weekly',
				priority: '0.8',
			}),
		);
	}

	// Blog posts: published only, by id (route is /blog/:id today).
	const posts = await fetchTable(
		'blog_posts',
		'select=id,slug,updated_at&published=eq.true',
	);
	for (const post of posts) {
		const key = post.slug || post.id;
		if (!key) continue;
		urls.push(`${SITE_URL}/blog/${key}`);
		entries.push(
			urlEntry({
				loc: `${SITE_URL}/blog/${key}`,
				lastmod: post.updated_at || today,
				changefreq: 'monthly',
				priority: '0.6',
			}),
		);
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;

	await fs.mkdir(path.dirname(outputPath), { recursive: true });
	await fs.writeFile(outputPath, xml, 'utf8');
	console.log(
		`sitemap: wrote ${entries.length} URLs to ${path.relative(projectRoot, outputPath)} (${products.length} products, ${posts.length} posts)`,
	);

	await pingIndexNow(urls);
}

main().catch((err) => {
	console.error('sitemap generation failed:', err);
	process.exit(0); // never break the build
});
