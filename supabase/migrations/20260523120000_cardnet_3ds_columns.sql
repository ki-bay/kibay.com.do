-- CARDNET 3DS integration columns. Adds the audit trail we need for the
-- direct ZTRANS + 3DS Secure flow (the previous columns were modeled on the
-- hosted /Checkouts API, which we no longer use).
--
-- Flow recap:
--   1. /servicios/3ds/server/authentication → returns threeDSServerTransID + ACS challenge URL
--   2. Browser does the 3DS challenge
--   3. /servicios/3ds/server/status → returns authenticationValue (AVV) + ECI
--   4. /api/payment/transactions/sales → returns pnRef + approval-code
--
-- Card data (PAN/CVV/exp) is NEVER stored — these columns are the post-sale
-- audit trail only.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cardnet_integrator_tx_id TEXT,           -- our per-attempt UUID; signature input
  ADD COLUMN IF NOT EXISTS cardnet_three_ds_server_trans_id TEXT,   -- CARDNET 3DS server tx id (cross-step correlation)
  ADD COLUMN IF NOT EXISTS cardnet_eci TEXT,                        -- 3DS ECI value (02 = fully authenticated)
  ADD COLUMN IF NOT EXISTS cardnet_pn_ref TEXT,                     -- ProcessSale txn reference (for void/refund)
  ADD COLUMN IF NOT EXISTS cardnet_idempotency_key TEXT;            -- the idempotency-key we sent to /sales

CREATE INDEX IF NOT EXISTS orders_cardnet_three_ds_idx
  ON public.orders (cardnet_three_ds_server_trans_id)
  WHERE cardnet_three_ds_server_trans_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_cardnet_pn_ref_idx
  ON public.orders (cardnet_pn_ref)
  WHERE cardnet_pn_ref IS NOT NULL;
