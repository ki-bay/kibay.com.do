-- 1) Swap the hero image for Casa Club Day Pass to the wine-collection shot.
-- 2) Give rose + french-colombard the same "Fermentado"/"Fermented" ribbon
--    that kibay-wine already carries — they're all fermented wines from the
--    same Ocoa Bay portfolio.

UPDATE public.product_images
SET url = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011402/Collecion_de_vinos_en_ocoabay_iobvhf.webp'
WHERE product_id = (SELECT id FROM public.products WHERE slug = 'ocoa-bay-casa-club-day-pass');

UPDATE public.products
SET thumbnail_url = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011402/Collecion_de_vinos_en_ocoabay_iobvhf.webp',
    updated_at = now()
WHERE slug = 'ocoa-bay-casa-club-day-pass';

UPDATE public.products
SET ribbon_text_es = 'Fermentado',
    ribbon_text_en = 'Fermented',
    updated_at = now()
WHERE slug IN ('rose', 'french-colombard');
