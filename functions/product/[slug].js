// CF Pages Function for /product/:slug — injects product-specific meta
// tags into index.html so social-share scrapers see the right title,
// description, and image. The SPA still hydrates normally for users.

import { fetchOne, injectMeta, htmlToDescription, SITE_URL } from '../_lib/meta.js';

export async function onRequestGet({ request, env, params }) {
  const slug = params.slug;
  const product = await fetchOne(
    env,
    'products',
    `slug=eq.${encodeURIComponent(slug)}&select=slug,title_es,title_en,description_es,description_en,thumbnail_url&status=eq.published`,
  );

  // Unknown product → fall through to the SPA default (the 404 route).
  if (!product) {
    return env.ASSETS.fetch(new URL('/index.html', request.url));
  }

  // Pick Spanish copy by default — site is es-first and most DR customers
  // share in Spanish.
  const title = `${product.title_es || product.title_en || 'Producto'} — Kibay`;
  const descriptionRaw = product.description_es || product.description_en || '';
  const description = htmlToDescription(descriptionRaw);

  // Product photo if available; otherwise the homepage OG card.
  let image = product.thumbnail_url || '';
  if (image && image.startsWith('/')) image = `${SITE_URL}${image}`;
  if (!image) {
    image =
      'https://res.cloudinary.com/dwewurxla/image/upload/w_1200,h_630,c_fill,g_center,e_brightness:-40/l_text:Arial_150_700:KiB%CE%9BY,co_rgb:D4A574,g_south_west,x_70,y_260/fl_layer_apply/l_text:Arial_28_400:kibay.com.do,co_rgb:D4A574,g_south_west,x_70,y_90/fl_layer_apply/v1779053427/kibay_-vino_copy_q9mvz8.jpg';
  }

  return injectMeta(env, request, {
    title,
    description,
    image,
    url: `${SITE_URL}/product/${product.slug}`,
  });
}
