-- Replace the two broken /media/*.webp thumbnails on the experience
-- products with Cloudinary images that actually load. Re-uses photos
-- the user already provided for the /enjoy/* pages.

UPDATE public.products
   SET thumbnail_url = 'https://res.cloudinary.com/dwewurxla/image/upload/v1778724989/Babula_Shots_Rd_-67_r3w7ia.webp',
       updated_at = NOW()
 WHERE slug = 'ocoa-bay-wine-tour';

UPDATE public.products
   SET thumbnail_url = 'https://res.cloudinary.com/dwewurxla/image/upload/v1778724132/Babula_Shots_Rd_-46_iyjidf.webp',
       updated_at = NOW()
 WHERE slug = 'ocoa-bay-complete-experience';
