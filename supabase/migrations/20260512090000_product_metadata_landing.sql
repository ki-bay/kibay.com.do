-- ============================================================================
-- Product landing metadata
-- Populates `products.metadata` for the four live product slugs so that the
-- refactored generic /product/:slug page (ProductDetailPage.jsx) can render
-- the editorial hero + tasting + specs sections without hard-coding copy.
--
-- Shape (all keys optional, page falls back gracefully if absent):
--   eyebrow_es / eyebrow_en          -> small uppercase gold line above H1
--   title_accent_es / title_accent_en -> optional gold-tinted second line in H1
--   lead_es / lead_en                -> hero body paragraph
--   tasting.{aroma,flavor,finish,body}_{es,en} -> tasting cards
--   specs.{origin,vintage,varietal,abv,volume,format,ingredients,category}
--          (string OR {_es,_en} object) -> specs panel
-- ============================================================================

-- KIBAY SPARKLING ------------------------------------------------------------
UPDATE public.products
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'eyebrow_es', 'Espumante orgánico',
  'eyebrow_en', 'Organic sparkling',
  'title_accent_es', 'Espumante Lata',
  'title_accent_en', 'Sparkling Can',
  'lead_es', 'Fermentado, no saborizado. Vino auténtico, refrescantemente vivo: una expresión sofisticada del terroir dominicano elaborada para el disfrute moderno, en una elegante lata de aluminio de 250 ml.',
  'lead_en', 'Fermented, never flavored. Authentic wine, refreshingly alive — a sophisticated expression of Dominican terroir crafted for modern enjoyment, in a sleek 250ml aluminum can.',
  'tasting', jsonb_build_object(
    'aroma_es', 'Elegante y expresivo: mango maduro, toques florales tropicales y ralladura cítrica fresca.',
    'aroma_en', 'Elegant and expressive — ripe mango, tropical floral notes and bright citrus zest.',
    'flavor_es', 'La chinola aporta una acidez viva, contrapesada por un cuerpo redondo y frutal que nunca empalaga.',
    'flavor_en', 'Passion fruit brings lively acidity, balanced by a round, fruity body that never cloys.',
    'finish_es', 'Limpio, crujiente y persistente, con un recuerdo tropical que invita a otro sorbo.',
    'finish_en', 'Clean, crisp, and persistent, with a tropical echo that invites another sip.',
    'body_es', 'Burbuja fina y refrescante; seco y equilibrado.',
    'body_en', 'Fine, refreshing bubbles; dry and balanced.'
  ),
  'specs', jsonb_build_object(
    'category_es', 'Vino espumante orgánico',
    'category_en', 'Organic sparkling wine',
    'origin', 'Ocoa Bay, República Dominicana',
    'format_es', 'Lata de aluminio 250 ml (reciclable)',
    'format_en', '250ml aluminum can (recyclable)',
    'ingredients_es', 'Mango y chinola fermentados',
    'ingredients_en', 'Fermented mango and passion fruit',
    'abv', '6% ABV',
    'shelf_life_es', 'Mejor consumido en los 18 meses siguientes',
    'shelf_life_en', 'Best enjoyed within 18 months'
  )
)
WHERE slug = 'kibay-sparkling';

-- KIBAY WINE -----------------------------------------------------------------
UPDATE public.products
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'eyebrow_es', 'Vino tropical orgánico',
  'eyebrow_en', 'Organic tropical wine',
  'title_accent_es', 'Vino Tropical',
  'title_accent_en', 'Tropical Wine',
  'lead_es', 'Una expresión del terroir caribeño y de una enología innovadora. Suave, aromático y profundamente arraigado en la tierra de la República Dominicana.',
  'lead_en', 'An expression of Caribbean terroir and innovative winemaking. Smooth, aromatic, and deeply rooted in the land of the Dominican Republic.',
  'tasting', jsonb_build_object(
    'aroma_es', 'Intenso ramo de frutas tropicales: mango maduro, chinola y sutiles notas de azahar. Fragante sin ser perfumado.',
    'aroma_en', 'Intense bouquet of tropical fruits — ripe mango, passion fruit, and subtle citrus blossom. Fragrant without being perfumed.',
    'flavor_es', 'Pureza de fruta por encima de taninos densos o roble. Vibrante, cálido y naturalmente expresivo.',
    'flavor_en', 'Fruit purity over heavy tannins or oak. Vibrant, warm, and naturally expressive.',
    'finish_es', 'Cierra limpio, con un toque persistente de mineralidad.',
    'finish_en', 'Finishes clean, with a lingering hint of minerality.',
    'body_es', 'Ligero, suave y refrescante; estructura delicada.',
    'body_en', 'Light, smooth, refreshing; delicate structure.'
  ),
  'specs', jsonb_build_object(
    'category_es', 'Vino orgánico',
    'category_en', 'Organic wine',
    'origin', 'Bahía de Ocoa, República Dominicana',
    'vintage', '2026',
    'varietal_es', 'Mango y chinola fermentados',
    'varietal_en', 'Fermented mango and passion fruit',
    'format_es', 'Botella de vidrio 750 ml (reciclable)',
    'format_en', '750ml glass bottle (recyclable)',
    'abv', '8% ABV',
    'shelf_life_es', 'Mejor consumido en los 36 meses siguientes',
    'shelf_life_en', 'Best enjoyed within 36 months'
  )
)
WHERE slug = 'kibay-wine';

-- ROSÉ -----------------------------------------------------------------------
UPDATE public.products
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'eyebrow_es', 'Vino rosado seco',
  'eyebrow_en', 'Dry rosé',
  'lead_es', 'Un rosado elaborado exclusivamente con uva, de perfil limpio y elegante. Notas sutiles de frutos rojos y un final refrescante; equilibrio entre dulzura natural y acidez fresca.',
  'lead_en', 'A rosé made exclusively from grapes, with a clean and elegant profile. Subtle berry notes and a refreshing finish; a balance between natural sweetness and crisp acidity.',
  'tasting', jsonb_build_object(
    'aroma_es', 'Aromas frescos de uva con sutiles notas florales.',
    'aroma_en', 'Bouquet of fresh grape aromas with subtle floral undertones.',
    'flavor_es', 'Perfil limpio y elegante con notas de frutos rojos.',
    'flavor_en', 'Clean and elegant profile with berry notes.',
    'finish_es', 'Brillante y refrescante.',
    'finish_en', 'Bright and refreshing.',
    'body_es', 'Ligero a medio cuerpo, textura suave.',
    'body_en', 'Light to medium-bodied, smooth texture.'
  ),
  'specs', jsonb_build_object(
    'category_es', 'Vino rosado',
    'category_en', 'Rosé wine',
    'origin', 'Bahía de Ocoa, República Dominicana',
    'vintage', '2026',
    'varietal_es', 'Uva (mezcla rosado)',
    'varietal_en', 'Grape (rosé blend)',
    'format_es', 'Botella 750 ml',
    'format_en', '750ml bottle'
  )
)
WHERE slug = 'rose';

-- FRENCH COLOMBARD -----------------------------------------------------------
UPDATE public.products
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'eyebrow_es', 'Vino blanco brillante',
  'eyebrow_en', 'Bright white wine',
  'lead_es', 'Vino blanco fresco y crujiente, de alta acidez. Notas brillantes de manzana verde, cítricos y pera, con matices de melón y frutas tropicales.',
  'lead_en', 'A fresh, crisp white wine with high acidity. Bright notes of green apple, citrus, and pear, with hints of melon and tropical fruit.',
  'tasting', jsonb_build_object(
    'aroma_es', 'Aromas frescos y frutales: manzana, cítricos y notas florales.',
    'aroma_en', 'Fresh, fruity aromas — apple, citrus, and floral notes.',
    'flavor_es', 'Brillante y crujiente, alta acidez; manzana verde, pera, cítricos y un toque tropical.',
    'flavor_en', 'Bright and crisp with high acidity; green apple, pear, citrus, and a tropical touch.',
    'finish_es', 'Refrescante y persistente, con vivacidad cítrica.',
    'finish_en', 'Refreshing and persistent, with lively citrus.',
    'body_es', 'Ligero a medio cuerpo, refrescante por su acidez.',
    'body_en', 'Light to medium-bodied, refreshing due to high acidity.'
  ),
  'specs', jsonb_build_object(
    'category_es', 'Vino blanco',
    'category_en', 'White wine',
    'origin', 'Bahía de Ocoa, República Dominicana',
    'vintage', '2026',
    'varietal_es', 'French Colombard',
    'varietal_en', 'French Colombard',
    'format_es', 'Botella 750 ml',
    'format_en', '750ml bottle'
  )
)
WHERE slug = 'french-colombard';
