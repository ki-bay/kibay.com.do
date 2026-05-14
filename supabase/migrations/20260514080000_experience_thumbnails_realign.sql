-- ============================================================================
-- Align experience product thumbnails with the photos used on
-- /vine-and-barrel. Earlier migration (20260513040000) replaced these
-- with Cloudinary URLs assuming /media/* was broken — it wasn't. These
-- /media paths are the SEO-named official photos served from the public
-- folder (HTTP 200) and look much better as excursion cards.
-- Casa Club Day Pass keeps the Cloudinary pool photo because no
-- equivalent /media file exists for it.
-- ============================================================================

UPDATE public.products
   SET thumbnail_url = '/media/ocoabay-degustacion-vino-dominicano.webp',
       updated_at = NOW()
 WHERE slug = 'ocoa-bay-wine-tour';

UPDATE public.products
   SET thumbnail_url = '/media/vinedo-republica-dominicana-aerial.webp',
       updated_at = NOW()
 WHERE slug = 'ocoa-bay-complete-experience';

-- Casa Club stays at the Cloudinary pool photo (no /media equivalent)
-- but we ensure it's set consistently:
UPDATE public.products
   SET thumbnail_url = 'https://res.cloudinary.com/dwewurxla/image/upload/v1778724366/casa_Club_kibay_ocoa_bay_picina_fxtzv8.webp',
       updated_at = NOW()
 WHERE slug = 'ocoa-bay-casa-club-day-pass';
