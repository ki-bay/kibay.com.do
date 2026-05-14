-- ============================================================================
-- Real Ocoa Bay excursion prices, from ocoabay.com/reservation/:
--   - Wine Tour Experience      US$65  p/p + taxes (18% VAT + 10%)
--   - OcoaBay Full Experience   US$145 p/p + taxes
--   - OcoaBay Club House        By consumption (à la carte minimum, no fixed price)
-- DOP conversion at ~60 DOP/USD. Taxes are NOT added to the stored price —
-- subtitles + product descriptions note "+ taxes" so customers see the real total.
-- ============================================================================

-- Wine Tour: $65 → 6500 cents USD; 3900 DOP → 390000 cents
UPDATE public.product_variants
   SET price_usd_cents = 6500,
       price_dop_cents = 390000,
       updated_at = NOW()
 WHERE sku = 'EXP-WINE-TOUR' OR product_id = (
   SELECT id FROM public.products WHERE slug = 'ocoa-bay-wine-tour'
 );

UPDATE public.products
   SET subtitle_es = 'Cata + recorrido por la viña — 90 minutos · US$65 p/p + impuestos',
       subtitle_en = 'Tasting + vineyard tour — 90 minutes · US$65 p/p + taxes',
       metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
         'price_per_person_usd', 65,
         'taxes_note_es', '+ 18% ITBIS + 10% propina',
         'taxes_note_en', '+ 18% VAT + 10% tax'
       ),
       updated_at = NOW()
 WHERE slug = 'ocoa-bay-wine-tour';

-- Full Experience: $145 → 14500 cents USD; 8700 DOP → 870000 cents
UPDATE public.product_variants
   SET price_usd_cents = 14500,
       price_dop_cents = 870000,
       updated_at = NOW()
 WHERE product_id = (
   SELECT id FROM public.products WHERE slug = 'ocoa-bay-complete-experience'
 );

UPDATE public.products
   SET subtitle_es = 'Cata + tour + Casa Club + menú orgánico de 3 tiempos · US$145 p/p + impuestos',
       subtitle_en = 'Tasting + tour + Casa Club + 3-course organic menu · US$145 p/p + taxes',
       metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
         'price_per_person_usd', 145,
         'taxes_note_es', '+ 18% ITBIS + 10% propina',
         'taxes_note_en', '+ 18% VAT + 10% tax'
       ),
       updated_at = NOW()
 WHERE slug = 'ocoa-bay-complete-experience';

-- Casa Club Day Pass: by-consumption, no fixed price.
-- Set both currencies to 0 cents and mark the metadata flag; UI reads this
-- flag and shows "Por consumo / By consumption" instead of a price.
UPDATE public.product_variants
   SET price_usd_cents = 0,
       price_dop_cents = 0,
       updated_at = NOW()
 WHERE product_id = (
   SELECT id FROM public.products WHERE slug = 'ocoa-bay-casa-club-day-pass'
 );

UPDATE public.products
   SET subtitle_es = 'Reservación obligatoria · Carta a la carta (mínimo de consumo) · 11:00 AM – 6:30 PM',
       subtitle_en = 'Reservation only · À la carte menu (minimum purchase) · 11:00 AM – 6:30 PM',
       description_es = 'Acceso al Casa Club Ocoa Bay solo con reservación previa. Carta a la carta — cocina farm-to-table del propio campo — con un mínimo de consumo. Uso de la piscina y todas las instalaciones del Casa Club de 11:00 AM a 6:30 PM.

Solo abrimos sábados, domingos y feriados. Las plazas son limitadas para mantener el ambiente tranquilo. Reserva por adelantado en ocoabay.com o llamando al +1 (849) 876-6563.',
       description_en = 'Casa Club Ocoa Bay access is reservation-only. À la carte menu — farm-to-table cuisine from the property — with a minimum spend. Pool and full Casa Club facilities from 11:00 AM to 6:30 PM.

Open Saturdays, Sundays, and holidays only. Spaces are limited to keep the atmosphere quiet. Book ahead at ocoabay.com or call +1 (849) 876-6563.',
       metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
         'price_by_consumption', true,
         'open_days', ARRAY['saturday','sunday','holiday'],
         'hours', '11:00 AM – 6:30 PM',
         'booking_required', true
       ),
       updated_at = NOW()
 WHERE slug = 'ocoa-bay-casa-club-day-pass';
