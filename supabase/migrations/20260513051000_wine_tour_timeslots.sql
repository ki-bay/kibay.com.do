-- Add `timeslots` to the Ocoa Bay Wine Tour metadata so the reservation
-- UI on /product/ocoa-bay-wine-tour renders a time picker with the three
-- daily tour departures.
--
-- The Full Experience and Casa Club Day Pass do NOT get this key —
-- they're single-time experiences (default 11:00 AM stored automatically).

UPDATE public.products
SET metadata = COALESCE(metadata, '{}'::jsonb)
  || jsonb_build_object('timeslots', jsonb_build_array('10:30','13:30','15:30'))
WHERE slug = 'ocoa-bay-wine-tour';
