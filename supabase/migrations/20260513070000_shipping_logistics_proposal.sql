-- ============================================================================
-- Logistics-grade shipping rates. Numbers benchmarked against:
--   Vimenpaq base RD$170 + insurance included, 130 DR branches
--   Domex RD$2.20/lb, 24-48h
--   Greater SD same-day services charging ~RD$250-350 flat
--   DR ecommerce free-shipping threshold trend RD$2,500-3,500
--
-- New tariff:
--   Estándar         (Vimenpaq/Domex, 2-3 days)
--     Bottle 1     = RD$250         |  USD $4.50
--     Bottles 2-11 = +RD$80 each    |  +$1.50 each
--     12+ bottles  = RD$1,400 flat  |  $24 flat
--   Express          (Vimenpaq priority, 24h)
--     Same formula + RD$200 flat surcharge across the board
--     12+ bottles  = RD$1,600       |  $27.50
--   Recogida en bodega                 → free (handled in code)
--
-- Free shipping over RD$5,000 / $90 subtotal (Estándar becomes free,
-- Express still pays the +RD$200 surcharge).
-- ============================================================================

UPDATE public.shipping_rates
   SET standard_cents       = 25000,    -- RD$250
       express_cents        = 45000,    -- RD$450 (= standard + 200 surcharge)
       per_additional_cents = 8000,     -- RD$80
       max_cents            = 140000,   -- RD$1,400 (Estándar bulk)
       bulk_threshold_count = 12,
       free_over_cents      = 500000,   -- RD$5,000 (free Estándar above this)
       updated_at           = NOW()
 WHERE currency = 'DOP';

UPDATE public.shipping_rates
   SET standard_cents       = 450,      -- $4.50
       express_cents        = 800,      -- $8.00 (= standard + $3.50 surcharge)
       per_additional_cents = 150,      -- $1.50
       max_cents            = 2400,     -- $24 (Estándar bulk)
       bulk_threshold_count = 12,
       free_over_cents      = 9000,     -- $90
       updated_at           = NOW()
 WHERE currency = 'USD';
