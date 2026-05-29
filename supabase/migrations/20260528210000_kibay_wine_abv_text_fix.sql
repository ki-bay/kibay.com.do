-- Update residual "8% ABV" / "8% de alcohol" copy on kibay-wine to 12%
-- to match the corrected metadata.specs.abv set in the prior migration.

UPDATE public.products
SET description_es = REPLACE(description_es, '8% de alcohol', '12% de alcohol'),
    description_en = REPLACE(description_en, '8% ABV', '12% ABV'),
    metadata = jsonb_set(
      jsonb_set(metadata, '{seo_description_es}',
        to_jsonb(REPLACE(metadata->>'seo_description_es', '8% ABV', '12% ABV'))
      ),
      '{seo_description_en}',
      to_jsonb(REPLACE(metadata->>'seo_description_en', '8% ABV', '12% ABV'))
    ),
    updated_at = now()
WHERE slug = 'kibay-wine';

-- Sparkling description also mentions ABV implicitly via tasting — no text fix needed.

-- FAQs on kibay-wine: replace any "8% ABV"/"8% de alcohol" copy in description_es/_en.
UPDATE public.product_additional_info
SET description_es = REPLACE(description_es, '8% de alcohol', '12% de alcohol'),
    description_en = REPLACE(description_en, '8% ABV', '12% ABV')
WHERE product_id = (SELECT id FROM public.products WHERE slug = 'kibay-wine');
