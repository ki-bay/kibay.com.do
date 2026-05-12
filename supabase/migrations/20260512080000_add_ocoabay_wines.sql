-- ============================================================================
-- Add Rosé + French Colombard to the shop (bilingual, "picture pending"
-- placeholder thumbnails). Style and tasting copy mirror the wine entries
-- on the vine-and-barrel page so the shop and that page stay consistent.
-- ============================================================================

-- ROSÉ -----------------------------------------------------------------------
INSERT INTO public.products (
  slug, title_es, title_en, subtitle_es, subtitle_en,
  description_es, description_en, thumbnail_url,
  status, purchasable, type, sort_order, metadata
) VALUES (
  'rose',
  'Rosé',
  'Rosé',
  'Vino rosado seco — añada 2026',
  'Dry rosé — 2026 vintage',
  'Un rosado elaborado exclusivamente con uva, de perfil limpio y elegante. Notas sutiles de frutos rojos y un final refrescante; equilibrio entre dulzura natural y acidez fresca.\n\nAroma: aromas frescos de uva con sutiles notas florales.\nSabor: perfil limpio y elegante con notas de frutos rojos.\nCuerpo: ligero a medio cuerpo, textura suave y final brillante.\n\nElaborado en Bahía de Ocoa, en la costa sur de la República Dominicana, donde el aire salino del Caribe y los suelos volcánicos dan al vino su carácter distintivo.',
  'A rosé made exclusively from grapes, with a clean and elegant profile. Subtle berry notes and a refreshing finish; a balance between natural sweetness and crisp acidity.\n\nAroma: bouquet of fresh grape aromas with subtle floral undertones.\nFlavor: clean and elegant profile with berry notes.\nBody: light to medium-bodied, smooth texture, bright finish.\n\nCrafted at Bahía de Ocoa on the southern coast of the Dominican Republic, where Caribbean salt air and volcanic soils give the wine its distinctive character.',
  'https://placehold.co/600x800/f4f4f0/D4A574?text=Imagen+pendiente',
  'published', true, 'physical', 2,
  '{"vintage": 2026, "vegan": true, "organic": true, "image_pending": true, "origin": "Bahía de Ocoa, República Dominicana"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE
  SET title_es = EXCLUDED.title_es,
      title_en = EXCLUDED.title_en,
      subtitle_es = EXCLUDED.subtitle_es,
      subtitle_en = EXCLUDED.subtitle_en,
      description_es = EXCLUDED.description_es,
      description_en = EXCLUDED.description_en,
      thumbnail_url = EXCLUDED.thumbnail_url,
      status = EXCLUDED.status,
      sort_order = EXCLUDED.sort_order,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, title_es, title_en, sku,
  price_usd_cents, price_dop_cents,
  inventory_quantity, manage_inventory, allow_backorder,
  weight_grams, sort_order
)
SELECT
  p.id, 'Botella 750ml', 'Bottle 750ml', 'W-ROSE26',
  2500, 150000,
  50, true, false,
  1200, 0
FROM public.products p WHERE p.slug = 'rose'
ON CONFLICT DO NOTHING;

-- FRENCH COLOMBARD -----------------------------------------------------------
INSERT INTO public.products (
  slug, title_es, title_en, subtitle_es, subtitle_en,
  description_es, description_en, thumbnail_url,
  status, purchasable, type, sort_order, metadata
) VALUES (
  'french-colombard',
  'French Colombard',
  'French Colombard',
  'Vino blanco brillante — añada 2026',
  'Bright white wine — 2026 vintage',
  'Vino blanco fresco y crujiente, de alta acidez. Notas brillantes de manzana verde, cítricos y pera, con matices de melón y frutas tropicales.\n\nAroma: aromas frescos y frutales con notas de manzana, cítricos y matices florales.\nSabor: brillante y crujiente, con alta acidez; manzana verde, pera, cítricos y un toque tropical.\nCuerpo: ligero a medio cuerpo, refrescante por su acidez.\n\nElaborado a partir de la variedad francesa Colombard, cultivada en Bahía de Ocoa, en la costa sur de la República Dominicana. Versátil para maridajes y disfrute diario.',
  'A fresh, crisp white wine with high acidity. Bright notes of green apple, citrus, and pear, with hints of melon and tropical fruit.\n\nAroma: fresh, fruity aromas — apple, citrus, and floral notes.\nFlavor: bright and crisp with high acidity; green apple, pear, citrus, and a tropical touch.\nBody: light to medium-bodied, refreshing due to high acidity.\n\nMade from the French Colombard variety, grown at Bahía de Ocoa on the southern coast of the Dominican Republic. Versatile for pairings and everyday enjoyment.',
  'https://placehold.co/600x800/f4f4f0/D4A574?text=Imagen+pendiente',
  'published', true, 'physical', 3,
  '{"vintage": 2026, "vegan": true, "organic": true, "image_pending": true, "origin": "Bahía de Ocoa, República Dominicana"}'::jsonb
)
ON CONFLICT (slug) DO UPDATE
  SET title_es = EXCLUDED.title_es,
      title_en = EXCLUDED.title_en,
      subtitle_es = EXCLUDED.subtitle_es,
      subtitle_en = EXCLUDED.subtitle_en,
      description_es = EXCLUDED.description_es,
      description_en = EXCLUDED.description_en,
      thumbnail_url = EXCLUDED.thumbnail_url,
      status = EXCLUDED.status,
      sort_order = EXCLUDED.sort_order,
      metadata = EXCLUDED.metadata,
      updated_at = NOW();

INSERT INTO public.product_variants (
  product_id, title_es, title_en, sku,
  price_usd_cents, price_dop_cents,
  inventory_quantity, manage_inventory, allow_backorder,
  weight_grams, sort_order
)
SELECT
  p.id, 'Botella 750ml', 'Bottle 750ml', 'W-FRENCH26',
  2800, 170000,
  50, true, false,
  1200, 0
FROM public.products p WHERE p.slug = 'french-colombard'
ON CONFLICT DO NOTHING;
