-- Refresh product hero images to the new Cloudinary set photographed at Ocoa Bay.
-- f_auto/q_auto/w_1200 picks AVIF/WebP per browser and caps the served size
-- for product cards + product detail.
-- Both product_images.url AND products.thumbnail_url are updated so any
-- consumer (PDP gallery, shop cards, HomePage product cards via mapProduct.image)
-- picks up the change without further code changes.

UPDATE public.product_images
SET url = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011402/Kibay_Espumante_Lata_ocoabay_w2hagj.webp'
WHERE product_id = (SELECT id FROM public.products WHERE slug = 'kibay-sparkling');

UPDATE public.product_images
SET url = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011402/Vino_rose_ocoabay_nxchgo.webp'
WHERE product_id = (SELECT id FROM public.products WHERE slug = 'rose');

UPDATE public.product_images
SET url = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011402/Kibay_vino_tropical_mango_y_chinola_eiy2go.webp'
WHERE product_id = (SELECT id FROM public.products WHERE slug = 'kibay-wine');

UPDATE public.product_images
SET url = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011402/Vino_blanco_ocoabay_colombard_french_nbxcbo.webp'
WHERE product_id = (SELECT id FROM public.products WHERE slug = 'french-colombard');

UPDATE public.products
SET thumbnail_url = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011402/Kibay_Espumante_Lata_ocoabay_w2hagj.webp',
    updated_at = now()
WHERE slug = 'kibay-sparkling';

UPDATE public.products
SET thumbnail_url = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011402/Vino_rose_ocoabay_nxchgo.webp',
    updated_at = now()
WHERE slug = 'rose';

UPDATE public.products
SET thumbnail_url = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011402/Kibay_vino_tropical_mango_y_chinola_eiy2go.webp',
    updated_at = now()
WHERE slug = 'kibay-wine';

UPDATE public.products
SET thumbnail_url = 'https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011402/Vino_blanco_ocoabay_colombard_french_nbxcbo.webp',
    updated_at = now()
WHERE slug = 'french-colombard';
