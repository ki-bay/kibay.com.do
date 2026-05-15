-- Replace the French Colombard placeholder with the real bottle shot.
-- File: /public/media/ocoabay-french-colombard-vino-dominicano.webp
-- (provided by Kibay, converted from JPEG to WebP at q85, ~46 KB.)
--
-- Also drops the metadata.image_pending flag so the storefront stops
-- treating this product as awaiting a photo.

UPDATE public.products
   SET thumbnail_url = '/media/ocoabay-french-colombard-vino-dominicano.webp',
       metadata = COALESCE(metadata, '{}'::jsonb) - 'image_pending',
       updated_at = NOW()
 WHERE slug = 'french-colombard';

-- Mirror the photo into product_images (used by the PDP gallery). If a
-- placeholder row already exists, replace its URL; otherwise insert a
-- fresh row at sort_order 0.
DO $$
DECLARE
  v_product_id UUID;
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_product_id FROM public.products WHERE slug = 'french-colombard';
  IF v_product_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_existing_id
    FROM public.product_images
   WHERE product_id = v_product_id
   ORDER BY sort_order ASC
   LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.product_images
       SET url = '/media/ocoabay-french-colombard-vino-dominicano.webp',
           alt_text = 'Kibay French Colombard — vino blanco seco de Bahía de Ocoa, República Dominicana',
           sort_order = 0
     WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
    VALUES (
      v_product_id,
      '/media/ocoabay-french-colombard-vino-dominicano.webp',
      'Kibay French Colombard — vino blanco seco de Bahía de Ocoa, República Dominicana',
      0
    );
  END IF;
END $$;
