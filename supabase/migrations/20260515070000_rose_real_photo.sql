-- Replace the Rosé placeholder image with the real bottle shot. The file
-- is committed under /public/media/ocoabay-vino-rosado-dominicano.webp
-- (downloaded from ocoabay.com/wp-content/uploads/2026/01/Wine-Rose-02.webp
-- and renamed for SEO) so it serves directly from our own origin.
--
-- We also drop the metadata.image_pending flag so the storefront stops
-- treating this product as awaiting a photo.

UPDATE public.products
   SET thumbnail_url = '/media/ocoabay-vino-rosado-dominicano.webp',
       metadata = COALESCE(metadata, '{}'::jsonb) - 'image_pending',
       updated_at = NOW()
 WHERE slug = 'rose';

-- Mirror the photo into product_images (used by the PDP gallery). If a
-- placeholder row exists for this product, replace its URL; otherwise
-- insert a fresh row at sort_order 0.
DO $$
DECLARE
  v_product_id UUID;
  v_existing_id UUID;
BEGIN
  SELECT id INTO v_product_id FROM public.products WHERE slug = 'rose';
  IF v_product_id IS NULL THEN RETURN; END IF;

  SELECT id INTO v_existing_id
    FROM public.product_images
   WHERE product_id = v_product_id
   ORDER BY sort_order ASC
   LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.product_images
       SET url = '/media/ocoabay-vino-rosado-dominicano.webp',
           alt_text = 'Kibay Rosé — vino rosado seco de Bahía de Ocoa, República Dominicana',
           sort_order = 0
     WHERE id = v_existing_id;
  ELSE
    INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
    VALUES (
      v_product_id,
      '/media/ocoabay-vino-rosado-dominicano.webp',
      'Kibay Rosé — vino rosado seco de Bahía de Ocoa, República Dominicana',
      0
    );
  END IF;
END $$;
