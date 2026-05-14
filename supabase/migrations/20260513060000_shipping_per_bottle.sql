-- ============================================================================
-- Per-bottle shipping with a hard cap. Replaces the previous flat-rate
-- behavior (single `standard_cents` / `express_cents` regardless of cart
-- size) with: base for the first bottle, +per_additional_cents each
-- additional bottle, capped at max_cents. Experience products (excursions,
-- day passes) are NOT counted — the SPA filters them out before calling
-- the rate function.
--
-- Brand policy (DOP):
--   Standard: RD$200 for 1 bottle, +RD$100 each, max RD$1,600
--   Express:  RD$400 for 1 bottle, +RD$100 each, max RD$1,600
-- USD mirrors the shape at ~60 DOP/USD.
-- ============================================================================

ALTER TABLE public.shipping_rates
  ADD COLUMN IF NOT EXISTS per_additional_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_cents INTEGER NOT NULL DEFAULT 0;

-- Old `free_over_cents` is no longer used by the new formula but we keep
-- the column so the old shipping_rates admin page doesn't break. Set it
-- to a huge number so it never triggers if any legacy code still reads it.
UPDATE public.shipping_rates
   SET per_additional_cents = 10000,    -- RD$100
       max_cents = 160000,               -- RD$1,600
       free_over_cents = 999999999,
       updated_at = NOW()
 WHERE currency = 'DOP';

UPDATE public.shipping_rates
   SET per_additional_cents = 200,       -- $2
       max_cents = 3000,                  -- $30
       free_over_cents = 999999999,
       updated_at = NOW()
 WHERE currency = 'USD';
