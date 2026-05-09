-- Swap the placeholder Unsplash thumbnails for the real Ocoa Bay photos
-- now hosted at /media/.

UPDATE public.products
SET thumbnail_url = '/media/ocoabay-degustacion-vino-dominicano.webp',
    updated_at = now()
WHERE slug = 'ocoa-bay-wine-tour';

UPDATE public.products
SET thumbnail_url = '/media/vinedo-republica-dominicana-aerial.webp',
    updated_at = now()
WHERE slug = 'ocoa-bay-complete-experience';
