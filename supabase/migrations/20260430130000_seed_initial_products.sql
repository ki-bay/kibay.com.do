-- Seed the 2 launch products so the live site keeps working through the
-- Hostinger → Supabase catalog cutover. Copy is intentionally minimal —
-- richer descriptions and final pricing will be set via the admin UI.
--
-- Idempotent via slug uniqueness.

-- ---------------------------------------------------------------------------
-- Kibay Espumante Lata / Sparkling Can
-- ---------------------------------------------------------------------------
INSERT INTO public.products (
  slug, title_es, title_en, subtitle_es, subtitle_en,
  ribbon_text_es, ribbon_text_en,
  description_es, description_en,
  thumbnail_url, status, purchasable, type, sort_order
) VALUES (
  'kibay-sparkling',
  'Kibay Espumante Lata',
  'Ki-BAY Sparkling Can',
  'Espumante orgánico de mango y maracuyá',
  'Sparkling Passion Fruit Beverage',
  'Espumante',
  'Sparkling',
  '<p>Vino espumante orgánico fermentado naturalmente con mango y maracuyá del sur de la República Dominicana. Refrescante, moderno e inconfundiblemente caribeño — presentado en una elegante lata de aluminio de 250ml.</p>',
  '<p>Organic sparkling wine, naturally fermented with mango and passion fruit from the south of the Dominican Republic. Fresh, modern, and unmistakably Caribbean — presented in a sleek 250ml aluminum can.</p>',
  'https://cdn.zyrosite.com/cdn-ecommerce/store_01KGN19HPRQHW5WRC1RMR0FCRZ/assets/4711ddb9-cd55-4c38-b0f0-55fbeca755ab.png',
  'published', true, 'physical', 0
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT p.id,
       'https://cdn.zyrosite.com/cdn-ecommerce/store_01KGN19HPRQHW5WRC1RMR0FCRZ/assets/4711ddb9-cd55-4c38-b0f0-55fbeca755ab.png',
       'Lata de Kibay Espumante',
       0
FROM public.products p
WHERE p.slug = 'kibay-sparkling'
  AND NOT EXISTS (SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id);

INSERT INTO public.product_variants (
  product_id, title_es, title_en, sku,
  price_usd_cents, price_dop_cents,
  inventory_quantity, manage_inventory, weight_grams, sort_order
)
SELECT p.id, 'Lata 250ml', '250ml Can', 'S-KIBAY-CAN',
       800, 50000,
       50, true, 250, 0
FROM public.products p
WHERE p.slug = 'kibay-sparkling'
  AND NOT EXISTS (SELECT 1 FROM public.product_variants v WHERE v.product_id = p.id);

INSERT INTO public.product_collection_assignments (product_id, collection_id, sort_order)
SELECT p.id, c.id, 0
FROM public.products p, public.product_collections c
WHERE p.slug = 'kibay-sparkling' AND c.slug = 'sparkling'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Kibay Vino Tropical / Tropical Wine
-- ---------------------------------------------------------------------------
INSERT INTO public.products (
  slug, title_es, title_en, subtitle_es, subtitle_en,
  ribbon_text_es, ribbon_text_en,
  description_es, description_en,
  thumbnail_url, status, purchasable, type, sort_order
) VALUES (
  'kibay-wine',
  'Kibay Vino Tropical',
  'Kibay Tropical Wine',
  'Vino caribeño, reimaginado',
  'Caribbean wine, reimagined',
  'Fermentado',
  'Fermented',
  '<p>Vino tropical nacido en la República Dominicana, elaborado en Ocoa Bay. Producido por fermentación a partir de frutas tropicales locales, expresa el carácter caribeño — vibrante, cálido y naturalmente expresivo.</p><p>Esto <strong>no</strong> es una bebida con sabor ni un cóctel. Es <strong>vino</strong>, moldeado por los trópicos.</p>',
  '<p>A tropical wine born in the Dominican Republic, crafted at Ocoa Bay. Made through fermentation from locally sourced tropical fruits, Kibay offers an authentic expression of Caribbean character — vibrant, warm, and naturally expressive.</p><p>This is <strong>not</strong> a flavored beverage or a cocktail. This is <strong>wine</strong>, shaped by the tropics.</p>',
  'https://cdn.zyrosite.com/cdn-ecommerce/store_01KGN19HPRQHW5WRC1RMR0FCRZ/assets/4d61edcd-3064-43f1-a335-6a135282e38f.jpg',
  'published', true, 'physical', 1
) ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT p.id,
       'https://cdn.zyrosite.com/cdn-ecommerce/store_01KGN19HPRQHW5WRC1RMR0FCRZ/assets/4d61edcd-3064-43f1-a335-6a135282e38f.jpg',
       'Botella de Kibay Vino Tropical',
       0
FROM public.products p
WHERE p.slug = 'kibay-wine'
  AND NOT EXISTS (SELECT 1 FROM public.product_images pi WHERE pi.product_id = p.id);

INSERT INTO public.product_variants (
  product_id, title_es, title_en, sku,
  price_usd_cents, price_dop_cents,
  inventory_quantity, manage_inventory, weight_grams, sort_order
)
SELECT p.id, 'Botella 750ml', '750ml Bottle', 'W-KIBAY26',
       2600, 160000,
       50, true, 1200, 0
FROM public.products p
WHERE p.slug = 'kibay-wine'
  AND NOT EXISTS (SELECT 1 FROM public.product_variants v WHERE v.product_id = p.id);

INSERT INTO public.product_collection_assignments (product_id, collection_id, sort_order)
SELECT p.id, c.id, 0
FROM public.products p, public.product_collections c
WHERE p.slug = 'kibay-wine' AND c.slug = 'fermented'
ON CONFLICT DO NOTHING;
