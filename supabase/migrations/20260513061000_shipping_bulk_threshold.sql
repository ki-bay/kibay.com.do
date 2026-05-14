-- Add an explicit bulk threshold to shipping_rates. When the cart contains
-- this many shippable bottles or more, shipping jumps to max_cents (the
-- "bulk" price) regardless of what the per-bottle scaling would compute.
--
-- Brand policy: 1 bottle = base. Bottles 2-11 = base + (n-1) * 100.
-- 12+ bottles = RD$1,600 flat (USD: $30).

ALTER TABLE public.shipping_rates
  ADD COLUMN IF NOT EXISTS bulk_threshold_count INTEGER NOT NULL DEFAULT 999;

UPDATE public.shipping_rates SET bulk_threshold_count = 12 WHERE currency IN ('DOP','USD');
