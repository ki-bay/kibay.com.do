-- Casa Club Day Pass: restore the pool photo as the hero (image[0])
-- and add the Babula vineyard shot from Supabase Storage as a second
-- gallery image. ProductDetailPage's hero prefers product_images[0],
-- so seeding the pool photo first keeps the header looking "as before".

-- Make this idempotent: remove any existing rows for the product first.
DELETE FROM public.product_images
WHERE product_id = (SELECT id FROM public.products WHERE slug = 'ocoa-bay-casa-club-day-pass');

INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT id,
       'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1600/v1778724366/casa_Club_kibay_ocoa_bay_picina_fxtzv8.webp',
       'Piscina de Casa Club en Bahía de Ocoa, Kibay',
       0
FROM public.products WHERE slug = 'ocoa-bay-casa-club-day-pass';

INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT id,
       'https://bsnxwajuqkatrmgoqcnu.supabase.co/storage/v1/object/public/blog_media/auto/1aZVGN6SgboKVYNnobKbnEHkMsoWqIPC1/1aZVGN6SgboKVYNnobKbnEHkMsoWqIPC1.webp',
       'Casa Club en Bahía de Ocoa — vinos y vista a la bahía',
       1
FROM public.products WHERE slug = 'ocoa-bay-casa-club-day-pass';

-- Thumbnail (used by cards/listings) goes back to the pool photo.
UPDATE public.products
SET thumbnail_url = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1778724366/casa_Club_kibay_ocoa_bay_picina_fxtzv8.webp',
    updated_at = now()
WHERE slug = 'ocoa-bay-casa-club-day-pass';
