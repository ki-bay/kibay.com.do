-- CARDNET integration columns on orders. Mirrors what we already store
-- for Stripe (stripe_payment_intent_id, etc.) so admin views can show
-- either acquirer side-by-side.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT,                 -- 'stripe' | 'cardnet'
  ADD COLUMN IF NOT EXISTS cardnet_session_id TEXT,             -- returned by /Checkouts (session id)
  ADD COLUMN IF NOT EXISTS cardnet_authorization_code TEXT,     -- AuthorizationCode (6 chars)
  ADD COLUMN IF NOT EXISTS cardnet_reference_number TEXT,       -- RetrievalReferenceNumber
  ADD COLUMN IF NOT EXISTS cardnet_response_code TEXT,          -- ISO 8583 response code
  ADD COLUMN IF NOT EXISTS cardnet_response_message TEXT;       -- human-readable failure reason

-- Optional index for the rare case admin searches by CARDNET reference
CREATE INDEX IF NOT EXISTS orders_cardnet_session_id_idx ON public.orders (cardnet_session_id)
  WHERE cardnet_session_id IS NOT NULL;
