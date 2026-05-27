-- CARDNET Botón de Pago (Webpantalla) — schema correction.
--
-- Per Hansel Aybar's clarification on 2026-05-27 the active product for Kibay
-- is hosted Botón de Pago, NOT ZTRANS direct API. The prior session built the
-- ZTRANS integration based on stale PDFs; this migration removes the now-dead
-- columns and adds the one column the hosted flow needs (`cardnet_session_key`)
-- on top of the columns already in place from 20260517100000_cardnet_columns.sql.
--
-- Existing columns that stay (used by hosted flow):
--   payment_method               'cardnet' | 'stripe'
--   cardnet_session_id           CARDNET's SESSION GUID returned by POST /sessions
--   cardnet_authorization_code   AuthorizationCode from verification response
--   cardnet_reference_number     RetrievalReferenceNumber
--   cardnet_response_code        ISO 8583 code ('00' = approved)
--   cardnet_response_message     human-readable status
--
-- Columns added now:
--   cardnet_session_key          the `sk` param needed for the verify GET
--   cardnet_tx_token             CARDNET's TxToken (for refunds/voids later)
--
-- Columns DROPPED (were for the wrong ZTRANS integration):
--   cardnet_integrator_tx_id
--   cardnet_three_ds_server_trans_id
--   cardnet_eci
--   cardnet_pn_ref
--   cardnet_idempotency_key

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS cardnet_integrator_tx_id,
  DROP COLUMN IF EXISTS cardnet_three_ds_server_trans_id,
  DROP COLUMN IF EXISTS cardnet_eci,
  DROP COLUMN IF EXISTS cardnet_pn_ref,
  DROP COLUMN IF EXISTS cardnet_idempotency_key,
  ADD COLUMN IF NOT EXISTS cardnet_session_key TEXT,
  ADD COLUMN IF NOT EXISTS cardnet_tx_token TEXT;

-- Drop the indexes that referenced the removed columns (if present).
DROP INDEX IF EXISTS orders_cardnet_three_ds_idx;
DROP INDEX IF EXISTS orders_cardnet_pn_ref_idx;

CREATE INDEX IF NOT EXISTS orders_cardnet_tx_token_idx ON public.orders (cardnet_tx_token)
  WHERE cardnet_tx_token IS NOT NULL;
