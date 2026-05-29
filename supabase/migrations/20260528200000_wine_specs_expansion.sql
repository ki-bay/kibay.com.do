-- Wine product specs expansion:
--   - Set ABV to 12% across the four wine bottles/cans (user-confirmed).
--   - Enrich metadata.specs with serving temp, pairings, style, producer,
--     glass, fermentation, closure, sulfites, allergens, vegan, organic.
-- These keys are now rendered by ProductDetailPage's specsEntries memo
-- (see knownKeys / labels extension in the same commit).

-- ---------------------------------------------------------------------------
-- Kibay Sparkling (can, mango + passion fruit)
-- ---------------------------------------------------------------------------
UPDATE public.products SET metadata = metadata
  || jsonb_build_object('specs', (metadata->'specs')
       || jsonb_build_object(
            'abv',             '12% ABV',
            'style_es',        'Espumante seco y frutal',
            'style_en',        'Dry, fruit-driven sparkling',
            'producer_es',     'Ocoa Bay · Bahía de Ocoa',
            'producer_en',     'Ocoa Bay · Bahía de Ocoa',
            'service_temp',    '6–8°C',
            'pairings_es',     'Ceviche, mariscos, frutas frescas, brunch',
            'pairings_en',     'Ceviche, seafood, fresh fruit, brunch',
            'glass_es',        'Copa flauta o tulipán',
            'glass_en',        'Flute or tulip glass',
            'fermentation_es', 'Fermentación natural de mango y chinola',
            'fermentation_en', 'Natural fermentation of mango and passion fruit',
            'closure_es',      'Lata de aluminio reciclable',
            'closure_en',      'Recyclable aluminum can',
            'sulfites_es',     'Contiene sulfitos',
            'sulfites_en',     'Contains sulfites',
            'allergens_es',    'Sin gluten, sin lácteos, sin frutos secos',
            'allergens_en',    'Gluten-free, dairy-free, nut-free',
            'vegan_es',        'Sí',
            'vegan_en',        'Yes',
            'organic_es',      'Sí (frutas orgánicas)',
            'organic_en',      'Yes (organic fruit)'
          )
     ),
    updated_at = now()
WHERE slug = 'kibay-sparkling';

-- ---------------------------------------------------------------------------
-- Kibay Vino Tropical (bottle, mango + passion fruit)
-- ---------------------------------------------------------------------------
UPDATE public.products SET metadata = metadata
  || jsonb_build_object('specs', (metadata->'specs')
       || jsonb_build_object(
            'abv',             '12% ABV',
            'style_es',        'Vino tropical seco y aromático',
            'style_en',        'Dry, aromatic tropical wine',
            'producer_es',     'Ocoa Bay · Bahía de Ocoa',
            'producer_en',     'Ocoa Bay · Bahía de Ocoa',
            'service_temp',    '8–10°C',
            'pairings_es',     'Ceviche, mariscos, queso fresco, ensaladas tropicales',
            'pairings_en',     'Ceviche, seafood, fresh cheese, tropical salads',
            'glass_es',        'Copa de vino blanco',
            'glass_en',        'White-wine glass',
            'fermentation_es', 'Fermentación de mango y chinola orgánicos',
            'fermentation_en', 'Organic mango and passion fruit fermentation',
            'closure_es',      'Corcho natural',
            'closure_en',      'Natural cork',
            'sulfites_es',     'Contiene sulfitos',
            'sulfites_en',     'Contains sulfites',
            'allergens_es',    'Sin gluten, sin lácteos, sin frutos secos',
            'allergens_en',    'Gluten-free, dairy-free, nut-free',
            'vegan_es',        'Sí',
            'vegan_en',        'Yes',
            'organic_es',      'Sí',
            'organic_en',      'Yes'
          )
     ),
    updated_at = now()
WHERE slug = 'kibay-wine';

-- ---------------------------------------------------------------------------
-- Rosé
-- ---------------------------------------------------------------------------
UPDATE public.products SET metadata = metadata
  || jsonb_build_object('specs', (metadata->'specs')
       || jsonb_build_object(
            'abv',             '12% ABV',
            'style_es',        'Rosado seco',
            'style_en',        'Dry rosé',
            'producer_es',     'Ocoa Bay · Bahía de Ocoa',
            'producer_en',     'Ocoa Bay · Bahía de Ocoa',
            'service_temp',    '8–10°C',
            'pairings_es',     'Ensaladas, pescado, pasta, queso de cabra',
            'pairings_en',     'Salads, fish, pasta, goat cheese',
            'glass_es',        'Copa de vino blanco o rosado',
            'glass_en',        'White- or rosé-wine glass',
            'fermentation_es', 'Fermentación tradicional de uva',
            'fermentation_en', 'Traditional grape fermentation',
            'closure_es',      'Corcho natural',
            'closure_en',      'Natural cork',
            'sulfites_es',     'Contiene sulfitos',
            'sulfites_en',     'Contains sulfites',
            'allergens_es',    'Sin gluten, sin lácteos, sin frutos secos',
            'allergens_en',    'Gluten-free, dairy-free, nut-free',
            'vegan_es',        'Sí',
            'vegan_en',        'Yes',
            'organic_es',      'Sí',
            'organic_en',      'Yes',
            'shelf_life_es',   'Mejor consumido en los 24 meses siguientes',
            'shelf_life_en',   'Best enjoyed within 24 months'
          )
     ),
    updated_at = now()
WHERE slug = 'rose';

-- ---------------------------------------------------------------------------
-- French Colombard
-- ---------------------------------------------------------------------------
UPDATE public.products SET metadata = metadata
  || jsonb_build_object('specs', (metadata->'specs')
       || jsonb_build_object(
            'abv',             '12% ABV',
            'style_es',        'Vino blanco seco y cítrico',
            'style_en',        'Dry, citrus-driven white',
            'producer_es',     'Ocoa Bay · Bahía de Ocoa',
            'producer_en',     'Ocoa Bay · Bahía de Ocoa',
            'service_temp',    '8–10°C',
            'pairings_es',     'Mariscos, pescado, sushi, ensaladas',
            'pairings_en',     'Seafood, fish, sushi, salads',
            'glass_es',        'Copa de vino blanco',
            'glass_en',        'White-wine glass',
            'fermentation_es', 'Fermentación tradicional de uva French Colombard',
            'fermentation_en', 'Traditional French Colombard fermentation',
            'closure_es',      'Corcho natural',
            'closure_en',      'Natural cork',
            'sulfites_es',     'Contiene sulfitos',
            'sulfites_en',     'Contains sulfites',
            'allergens_es',    'Sin gluten, sin lácteos, sin frutos secos',
            'allergens_en',    'Gluten-free, dairy-free, nut-free',
            'vegan_es',        'Sí',
            'vegan_en',        'Yes',
            'organic_es',      'Sí',
            'organic_en',      'Yes',
            'shelf_life_es',   'Mejor consumido en los 24 meses siguientes',
            'shelf_life_en',   'Best enjoyed within 24 months'
          )
     ),
    updated_at = now()
WHERE slug = 'french-colombard';
