-- Phase A: payment / data integrity hardening.
--
-- 1. webhook_events table — Stripe event idempotency. The webhook function
--    INSERTs the event_id with ON CONFLICT DO NOTHING; if it was already
--    there, the function returns early without re-processing.
--
-- 2. orders.status CHECK constraint — prevents typos that would skip the
--    inventory-decrement trigger (which only fires on transitions INTO 'paid').
--
-- 3. cancel_stale_awaiting_payment_orders() — opt-in cleanup that flips orders
--    stuck in 'awaiting_payment' for > 1 hour to 'canceled'. Call it manually
--    or schedule via pg_cron / a Supabase scheduled function.

-- ---------------------------------------------------------------------------
-- 1. Webhook event idempotency
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- No anon access; only the service-role key (used by Edge Functions) can read/write.
-- Service role bypasses RLS, so we don't need a permissive policy.

CREATE INDEX IF NOT EXISTS webhook_events_processed_at_idx
  ON public.webhook_events (processed_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Orders status CHECK
-- ---------------------------------------------------------------------------
-- First normalize any existing rows that fall outside the allowed set.
UPDATE public.orders
SET status = 'processing'
WHERE status IS NULL
   OR status NOT IN (
     'awaiting_payment','paid','processing','shipped','delivered',
     'canceled','failed','refunded','disputed'
   );

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (
    status IN (
      'awaiting_payment','paid','processing','shipped','delivered',
      'canceled','failed','refunded','disputed'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Stale-order cleanup
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_stale_awaiting_payment_orders(
  older_than_minutes INT DEFAULT 60
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INT;
BEGIN
  UPDATE public.orders
  SET status = 'canceled'
  WHERE status = 'awaiting_payment'
    AND created_at < now() - (older_than_minutes || ' minutes')::INTERVAL;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Caller restriction: only service role / admins should be able to invoke.
REVOKE ALL ON FUNCTION public.cancel_stale_awaiting_payment_orders(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_stale_awaiting_payment_orders(INT) TO service_role;
