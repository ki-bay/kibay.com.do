// generate-sitemap
// =============================================================================
// Returns a fresh sitemap.xml on every request, sourced live from Supabase.
// Replaces the no-op stub. Routed via CF Pages _redirects so a request for
// /sitemap.xml proxies here and Google sees up-to-date URLs even when the
// drive-pipeline auto-publishes between CF Pages builds.
//
// Static routes + products + blog posts are all included. ~10ms typical
// response time; crawlers hit this ~1×/day so load is negligible.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SITE_URL = 'https://kibay.com.do';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
// Use the publishable / anon key — only public data is queried.
const apiKey =
	Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';

const STATIC_ROUTES: { path: string; priority: string; changefreq: string }[] = [
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
	{ path: '/enjoy/amanecer', priority: '0.6', changefreq: 'monthly' },
	{ path: '/enjoy/amigos', priority: '0.6', changefreq: 'monthly' },
	{ path: '/enjoy/cocina', priority: '0.6', changefreq: 'monthly' },
	{ path: '/enjoy/piscina', priority: '0.6', changefreq: 'monthly' },
	{ path: '/enjoy/lectura', priority: '0.6', changefreq: 'monthly' },
	{ path: '/terms', priority: '0.3', changefreq: 'yearly' },
	{ path: '/privacy', priority: '0.3', changefreq: 'yearly' },
	{ path: '/shipping-returns', priority: '0.3', changefreq: 'yearly' },
];

const xmlEscape = (s: string) =>
	String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

async function fetchTable(table: string, query: string) {
	if (!supabaseUrl || !apiKey) return [];
	try {
		const r = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
			headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
		});
		if (!r.ok) return [];
		return (await r.json()) as Array<Record<string, string>>;
	} catch {
		return [];
	}
}

function urlEntry(loc: string, lastmod: string | null, changefreq: string, priority: string) {
	const lm = lastmod ? `\n    <lastmod>${xmlEscape(lastmod.slice(0, 10))}</lastmod>` : '';
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

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', {
			headers: { 'Access-Control-Allow-Origin': '*' },
		});
	}

	const today = new Date().toISOString();

	const entries = STATIC_ROUTES.map((r) =>
		urlEntry(`${SITE_URL}${r.path}`, today, r.changefreq, r.priority),
	);

	const products = await fetchTable('products', 'select=slug,updated_at&status=eq.published');
	for (const p of products) {
		if (!p.slug) continue;
		entries.push(urlEntry(`${SITE_URL}/product/${p.slug}`, p.updated_at || today, 'weekly', '0.8'));
	}

	const posts = await fetchTable('blog_posts', 'select=id,slug,updated_at&published=eq.true');
	for (const post of posts) {
		const key = post.slug || post.id;
		if (!key) continue;
		entries.push(urlEntry(`${SITE_URL}/blog/${key}`, post.updated_at || today, 'monthly', '0.6'));
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;

	return new Response(xml, {
		status: 200,
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			// Cache at the edge for 1 hour; crawlers hit this rarely anyway.
			'Cache-Control': 'public, max-age=3600',
			'Access-Control-Allow-Origin': '*',
		},
	});
});
