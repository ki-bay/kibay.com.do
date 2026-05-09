-- Seed Ocoa Bay experience products so they're purchasable on Kibay's checkout.
-- Idempotent via slug uniqueness.

WITH new_products AS (
  INSERT INTO public.products (
    slug, title_es, title_en, subtitle_es, subtitle_en,
    description_es, description_en,
    thumbnail_url, status, purchasable, type, sort_order, metadata
  )
  VALUES
    (
      'ocoa-bay-wine-tour',
      'Tour de Vino Ocoa Bay',
      'Ocoa Bay Wine Tour',
      'Cata + recorrido por la viña — 90 minutos',
      'Tasting + vineyard tour — 90 minutes',
      'Descubre uno de los pocos viñedos del Caribe. Esta experiencia de 90 minutos incluye una cata guiada de los vinos orgánicos de Ocoa Bay y un recorrido en carro eléctrico por las instalaciones, con visita a los viñedos y la bodega frente a la Bahía de Ocoa, República Dominicana. Disponible solo sábados y domingos.',
      'Discover one of the Caribbean''s few working vineyards. This 90-minute experience includes a guided tasting of Ocoa Bay''s organic wines and an electric-cart tour of the property, with stops at the vineyards and winery overlooking the Bay of Ocoa, Dominican Republic. Available Saturdays and Sundays only.',
      'https://images.unsplash.com/photo-1474722883778-792e7990302f?q=80&w=1600&auto=format&fit=crop',
      'published', true, 'experience', 100,
      jsonb_build_object(
        'duration_minutes', 90,
        'available_days', ARRAY['saturday','sunday'],
        'reservation_url', 'https://ocoabay.com/reservacion/',
        'location', 'Bahía de Ocoa, Carretera Hatillo Palmar de Ocoa Km 6/12, Hatillo, Azua 71003, DO'
      )
    ),
    (
      'ocoa-bay-complete-experience',
      'Experiencia Completa Ocoa Bay',
      'Complete Ocoa Bay Experience',
      'Cata + tour + Casa Club + menú orgánico de 3 tiempos',
      'Tasting + tour + Casa Club + 3-course organic menu',
      'La experiencia vitivinícola más completa del Caribe. Incluye cata guiada de Ocoa Wines, recorrido en carro eléctrico por viñedos y bodega, brindis de bienvenida en la Casa Club, menú de cocina orgánica de 3 tiempos (a elegir por persona), y acceso a la piscina y las instalaciones de la Casa Club desde las 11:00 AM hasta las 6:30 PM. Solo sábados y domingos.',
      'The most complete wine experience in the Caribbean. Includes guided Ocoa Wines tasting, electric-cart tour of vineyards and winery, welcome toast at Casa Club, three-course organic farm-to-table menu (your choice per guest), and full use of the Casa Club pool and grounds from 11:00 AM to 6:30 PM. Saturdays and Sundays only.',
      'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=1600&auto=format&fit=crop',
      'published', true, 'experience', 99,
      jsonb_build_object(
        'duration_minutes', 420,
        'available_days', ARRAY['saturday','sunday'],
        'reservation_url', 'https://ocoabay.com/reservacion/',
        'location', 'Bahía de Ocoa, Carretera Hatillo Palmar de Ocoa Km 6/12, Hatillo, Azua 71003, DO'
      )
    )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id, slug
)
INSERT INTO public.product_variants (
  product_id, title_es, title_en, sku,
  price_usd_cents, price_dop_cents,
  inventory_quantity, manage_inventory, weight_grams, sort_order
)
SELECT
  np.id,
  'Por persona', 'Per person',
  CASE np.slug WHEN 'ocoa-bay-wine-tour' THEN 'OCB-TOUR' ELSE 'OCB-FULL' END,
  CASE np.slug WHEN 'ocoa-bay-wine-tour' THEN 6500 ELSE 14500 END,        -- USD cents
  CASE np.slug WHEN 'ocoa-bay-wine-tour' THEN 390000 ELSE 870000 END,     -- DOP cents (~60 RD$/USD)
  0, false,                                                                -- service, no inventory
  0, 0
FROM new_products np;
