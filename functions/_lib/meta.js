// Shared helpers for CF Pages Functions that inject per-route meta tags
// into the SPA's index.html. Used by /product/[slug].js and /blog/[slug].js
// so social-share scrapers (Facebook, WhatsApp, Twitter, LinkedIn) see
// route-specific title, description, and OG image instead of the generic
// homepage meta the SPA can only inject after React runs (too late for
// scrapers that don't execute JS).

const SUPABASE_URL = 'https://bsnxwajuqkatrmgoqcnu.supabase.co';
// Publishable key is public by design (ships in the browser bundle too). Safe
// to hardcode here so the CF Pages Functions don't need extra env wiring.
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8ZiZVbDotPimSR6hIRrz2Q_zXM0tQv_';
const SITE_URL = 'https://kibay.com.do';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

// Strip HTML to a clean plain-text description, ~155 chars for OG/SERP.
export function htmlToDescription(html, maxLen = 155) {
  if (!html) return '';
  const text = String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).replace(/\s+\S*$/, '') + '…';
}

export async function fetchOne(env, table, query) {
  const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || SUPABASE_PUBLISHABLE_KEY;
  if (!key) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
    });
    if (!r.ok) return null;
    const arr = await r.json();
    return Array.isArray(arr) && arr.length ? arr[0] : null;
  } catch {
    return null;
  }
}

// Pull the SPA's index.html from the CF Pages asset bundle, then swap out
// the meta tags that matter for share previews. The SPA's react-helmet
// still runs after hydration for the user's browser — these tags are
// strictly for the scraper that fetched the URL before any JS executed.
export async function injectMeta(env, request, meta) {
  // env.ASSETS.fetch() resolves to the static index.html from the build.
  const indexUrl = new URL('/index.html', request.url);
  const indexResp = await env.ASSETS.fetch(indexUrl);
  let html = await indexResp.text();

  const url = meta.url || request.url;
  const title = meta.title || 'Kibay';
  const description = meta.description || '';
  const image = meta.image || '';

  // Replacements use the existing default values as anchors so we don't
  // need a templating engine. The defaults come from index.html.
  const swaps = [
    [
      /<title>[^<]*<\/title>/,
      `<title>${esc(title)}</title>`,
    ],
    [
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${esc(description)}" />`,
    ],
    [
      /<meta property="og:title" content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${esc(title)}" />`,
    ],
    [
      /<meta property="og:description" content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${esc(description)}" />`,
    ],
    [
      /<meta property="og:url" content="[^"]*"\s*\/>/,
      `<meta property="og:url" content="${esc(url)}" />`,
    ],
    [
      /<meta property="twitter:title" content="[^"]*"\s*\/>/,
      `<meta property="twitter:title" content="${esc(title)}" />`,
    ],
    [
      /<meta property="twitter:description" content="[^"]*"\s*\/>/,
      `<meta property="twitter:description" content="${esc(description)}" />`,
    ],
    [
      /<meta property="twitter:url" content="[^"]*"\s*\/>/,
      `<meta property="twitter:url" content="${esc(url)}" />`,
    ],
  ];
  if (image) {
    swaps.push([
      /<meta property="og:image" content="[^"]*"\s*\/>/,
      `<meta property="og:image" content="${esc(image)}" />`,
    ]);
    swaps.push([
      /<meta property="twitter:image" content="[^"]*"\s*\/>/,
      `<meta property="twitter:image" content="${esc(image)}" />`,
    ]);
  }
  for (const [re, replacement] of swaps) {
    html = html.replace(re, replacement);
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // 1h edge cache; if a product/post is edited, the SPA shows fresh
      // data immediately because the meta is for scrapers, not users.
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export { SITE_URL };
