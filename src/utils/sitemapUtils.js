import { supabase } from '@/lib/customSupabaseClient';

const escapeXml = (val) =>
  String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Build a single <url> entry with xhtml:link hreflang alternates (es, en, x-default).
 * Since the site uses single-URL multi-lang (no /en /es prefix), all hreflangs
 * point at the same URL — this is still a valid signal to search engines.
 */
const buildUrlEntry = ({ loc, lastmod, changefreq, priority }) => {
  const safeLoc = escapeXml(loc);
  return `  <url>
    <loc>${safeLoc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
    <xhtml:link rel="alternate" hreflang="es" href="${safeLoc}" />
    <xhtml:link rel="alternate" hreflang="en" href="${safeLoc}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${safeLoc}" />
  </url>\n`;
};

/**
 * Generates the XML sitemap string
 * @returns {Promise<string>}
 */
export const generateSitemapXml = async () => {
  const baseUrl = window.location.origin;

  // 1. Define Static Pages
  const staticPages = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/shop', priority: '0.9', changefreq: 'daily' },
    { loc: '/blog', priority: '0.9', changefreq: 'daily' },
    { loc: '/about', priority: '0.8', changefreq: 'monthly' },
    { loc: '/contact', priority: '0.7', changefreq: 'monthly' },
    { loc: '/why-cans', priority: '0.7', changefreq: 'monthly' },
    { loc: '/mango', priority: '0.8', changefreq: 'monthly' },
    { loc: '/passion-fruit', priority: '0.8', changefreq: 'monthly' },
    { loc: '/kibay-sparkling', priority: '0.8', changefreq: 'monthly' },
    { loc: '/kibay-wine', priority: '0.8', changefreq: 'monthly' },
    // Legal & Policy
    { loc: '/terms', priority: '0.5', changefreq: 'yearly' },
    { loc: '/privacy', priority: '0.5', changefreq: 'yearly' },
    { loc: '/shipping-returns', priority: '0.5', changefreq: 'yearly' },
  ];

  // 2. Fetch Dynamic Blog Posts
  let blogPosts = [];
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('published', true);

    if (error) throw error;
    blogPosts = data || [];
  } catch (error) {
    console.error('Error fetching blog posts for sitemap:', error);
    // Continue with static pages even if blog fetch fails
  }

  // 3. Fetch Dynamic Products (Supabase)
  let products = [];
  try {
    const { data, error } = await supabase
      .from('products')
      .select('slug, updated_at')
      .eq('published', true);

    if (error) throw error;
    products = (data || []).filter((p) => p.slug);
  } catch (error) {
    // Some schemas may not have a `published` column — try without filter
    try {
      const { data, error: e2 } = await supabase
        .from('products')
        .select('slug, updated_at');
      if (e2) throw e2;
      products = (data || []).filter((p) => p.slug);
    } catch (innerError) {
      console.error('Error fetching products for sitemap:', innerError);
    }
  }

  // 4. Build XML String
  const nowIso = new Date().toISOString();
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Add static pages
  staticPages.forEach((page) => {
    xml += buildUrlEntry({
      loc: `${baseUrl}${page.loc}`,
      lastmod: nowIso,
      changefreq: page.changefreq,
      priority: page.priority,
    });
  });

  // Add product pages
  products.forEach((product) => {
    const lastMod = product.updated_at ? new Date(product.updated_at).toISOString() : nowIso;
    xml += buildUrlEntry({
      loc: `${baseUrl}/product/${product.slug}`,
      lastmod: lastMod,
      changefreq: 'weekly',
      priority: '0.8',
    });
  });

  // Add blog posts
  blogPosts.forEach((post) => {
    const lastMod = post.updated_at ? new Date(post.updated_at).toISOString() : nowIso;
    xml += buildUrlEntry({
      loc: `${baseUrl}/blog/${post.slug}`,
      lastmod: lastMod,
      changefreq: 'weekly',
      priority: '0.8',
    });
  });

  xml += '</urlset>';
  return xml;
};
