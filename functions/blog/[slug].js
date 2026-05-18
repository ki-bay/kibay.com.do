// CF Pages Function for /blog/:slug — injects blog-post-specific meta
// tags into index.html so social-share scrapers see the post's title,
// excerpt, and hero image. The SPA still hydrates normally for users.

import { fetchOne, injectMeta, htmlToDescription, SITE_URL } from '../_lib/meta.js';

export async function onRequestGet({ request, env, params }) {
  const slug = params.slug;

  // Try slug first, then UUID (older posts use the id-based URL).
  let post = await fetchOne(
    env,
    'blog_posts',
    `slug=eq.${encodeURIComponent(slug)}&select=slug,title,description,seo_title,seo_description,featured_image_url,content&published=eq.true&limit=1`,
  );
  if (!post) {
    post = await fetchOne(
      env,
      'blog_posts',
      `id=eq.${encodeURIComponent(slug)}&select=slug,title,description,seo_title,seo_description,featured_image_url,content&published=eq.true&limit=1`,
    );
  }

  if (!post) {
    return env.ASSETS.fetch(new URL('/index.html', request.url));
  }

  const title = post.seo_title || post.title || 'Kibay';
  const description =
    post.seo_description ||
    post.description ||
    htmlToDescription(post.content);
  const image = post.featured_image_url || '';
  const url = `${SITE_URL}/blog/${post.slug || slug}`;

  return injectMeta(env, request, { title, description, image, url });
}
