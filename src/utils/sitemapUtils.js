import { supabase } from '@/lib/customSupabaseClient';

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
    console.error("Error fetching blog posts for sitemap:", error);
    // Continue with static pages even if blog fetch fails
  }

  // 3. Build XML String
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Add static pages
  staticPages.forEach(page => {
    xml += `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>\n`;
  });

  // Add blog posts
  blogPosts.forEach(post => {
    const lastMod = post.updated_at ? new Date(post.updated_at).toISOString() : new Date().toISOString();
    xml += `  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
  });

  xml += '</urlset>';
  return xml;
};