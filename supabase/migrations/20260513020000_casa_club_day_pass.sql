-- ============================================================================
-- Add a third "experience" product so the /enjoy/* pages can show three
-- excursion options (sort_order 99 wine tour, 100 complete experience,
-- 101 casa club day pass — chronological by sort, ascending price).
-- ============================================================================

INSERT INTO public.products (
  slug, title_es, title_en, subtitle_es, subtitle_en,
  description_es, description_en, thumbnail_url,
  status, purchasable, type, sort_order, metadata
) VALUES (
  'ocoa-bay-casa-club-day-pass',
  'Día en Casa Club',
  'Casa Club Day Pass',
  'Acceso al Casa Club · piscina, terraza y copa de bienvenida',
  'Casa Club access · pool, terrace, and welcome glass',
  'Un día en Casa Club Ocoa Bay: acceso a la piscina, terraza con vista a la bahía, una copa de bienvenida de Kibay y carta abierta para pedir comida y bebidas adicionales. Ideal para una tarde lenta, una reunión con amigos, o simplemente sentarse a leer frente al mar.\n\nIncluye:\n• Acceso al Casa Club de 10am a 6pm\n• Una copa de Kibay Espumante o Vino (a elegir)\n• Toallas y vestidor\n• Carta a la carta disponible (no incluida)\n\nReserva previa requerida. Las plazas son limitadas para mantener el ambiente tranquilo.',
  'A day at Casa Club Ocoa Bay: pool access, terrace with bay views, a welcome glass of Kibay, and an open menu for additional food and drinks. Perfect for a slow afternoon, a friends gathering, or simply sitting with a book by the sea.\n\nIncludes:\n• Casa Club access from 10am to 6pm\n• One welcome glass of Kibay Sparkling or Wine (your choice)\n• Towels and changing room\n• À la carte menu available (not included)\n\nAdvance booking required. Spaces are limited to keep the atmosphere quiet.',
  'https://res.cloudinary.com/dwewurxla/image/upload/v1778724366/casa_Club_kibay_ocoa_bay_picina_fxtzv8.webp',
  'published', true, 'experience', 101,
  '{"duration_hours": 8, "includes": ["Pool access", "Welcome glass", "Towels"], "booking_required": true, "origin": "Casa Club, Bahía de Ocoa"}'::jsonb
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
  p.id, 'Por persona', 'Per person', 'EXP-CASA-DAY',
  4500, 270000,
  100, false, true,
  0, 0
FROM public.products p WHERE p.slug = 'ocoa-bay-casa-club-day-pass'
ON CONFLICT DO NOTHING;
