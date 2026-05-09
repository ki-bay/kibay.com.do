-- Insert product_images rows for the two Ocoa Bay experience products so
-- the PDP gallery has something to render (the gallery reads from
-- product_images, not products.thumbnail_url).
--
-- Idempotent: wipes existing rows for these products and re-inserts.

DELETE FROM public.product_images
WHERE product_id IN (
  SELECT id FROM public.products WHERE slug IN ('ocoa-bay-wine-tour', 'ocoa-bay-complete-experience')
);

-- Wine Tour gallery: tasting → server pouring → aerial vineyard
INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT id, '/media/ocoabay-degustacion-vino-dominicano.webp',
  'Guided Caribbean wine tasting at Ocoa Bay vineyard, Dominican Republic',
  0 FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT id, '/media/ocoabay-vino-chinola-mango-fermentado.webp',
  'Pouring Ocoa Wines on the Casa Club terrace overlooking the Caribbean',
  1 FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT id, '/media/vino-produccion-ocoabay-vinedo.webp',
  'Aerial view of the Ocoa Bay vineyard at sunset — Caribbean wine in the Dominican Republic',
  2 FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT id, '/media/vino-dominicano-republica-dominicana.webp',
  'Single Ocoa Wines bottle on the Casa Club deck with mountain backdrop',
  3 FROM public.products WHERE slug = 'ocoa-bay-wine-tour';

-- Complete Experience gallery: bottles by pool → Casa Club view → wine table → aerial vineyard
INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT id, '/media/vinedo-republica-dominicana-aerial.webp',
  'Ocoa Bay bottles by the pool — Caribbean wine experience in the Dominican Republic',
  0 FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT id, '/media/kibay-vino-dominicano.webp',
  'Visitors at the Ocoa Bay Casa Club overlooking the Caribbean Sea',
  1 FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT id, '/media/kibay-vino-ocoa-bay.webp',
  'Casa Club dining table set with Ocoa Wines and a sea view',
  2 FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT id, '/media/vino-produccion-ocoabay-vinedo.webp',
  'Ocoa Bay vineyard at sunset overlooking the Caribbean',
  3 FROM public.products WHERE slug = 'ocoa-bay-complete-experience';

INSERT INTO public.product_images (product_id, url, alt_text, sort_order)
SELECT id, '/media/ocoabay-degustacion-vino-dominicano.webp',
  'Wine tasting on the Casa Club terrace at Ocoa Bay',
  4 FROM public.products WHERE slug = 'ocoa-bay-complete-experience';
