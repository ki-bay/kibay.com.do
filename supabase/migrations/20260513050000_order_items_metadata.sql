-- Add metadata jsonb column to order_items so each line item can carry
-- arbitrary structured data — e.g. reservation_date / reservation_time for
-- experience products (excursions, day passes, tours).
--
-- Existing rows default to '{}'. Wine bottles continue to insert with the
-- same default. Experience checkouts set {reservation_date, reservation_time}.
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
