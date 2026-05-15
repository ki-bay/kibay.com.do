-- Add `timeslots` to the Ocoa Bay Complete Experience so its product page
-- renders a time picker just like the Wine Tour. The complete experience
-- is a longer, full-program visit so it has fewer start times than the
-- 90-minute wine tour.
--
-- Casa Club Day Pass intentionally stays without `timeslots` (it's a
-- come-anytime-during-opening-hours pass; default 11:00 AM is stored
-- automatically by the PDP for ICS / order confirmation purposes).

UPDATE public.products
SET metadata = COALESCE(metadata, '{}'::jsonb)
  || jsonb_build_object('timeslots', jsonb_build_array('10:30','13:00'))
WHERE slug = 'ocoa-bay-complete-experience';
