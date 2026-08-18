-- Sequential invoice numbering.
--
-- No invoice_number column exists today — order_number isn't fiscal-
-- sequence-safe (guest/canceled/failed orders can create gaps in a way
-- that's fine for a support-facing order reference but not for an
-- accounting-facing invoice number). This adds a dedicated sequence,
-- assigned atomically server-side (never client-side, to avoid race
-- duplicates) only at the moment an order actually becomes 'paid' and gets
-- a real invoice generated — so the numbering stays contiguous for revenue
-- records instead of counting every attempted order.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS invoice_number TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS orders_invoice_number_idx
  ON public.orders (invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

-- Returns a formatted invoice number (e.g. 'INV-000123') by advancing the
-- sequence. SECURITY DEFINER + service_role-only grant, same access-control
-- pattern as cancel_stale_awaiting_payment_orders — only Edge Functions
-- (service role) generate invoices, never the client directly.
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_n BIGINT;
BEGIN
  v_n := nextval('public.invoice_number_seq');
  RETURN 'INV-' || lpad(v_n::text, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_invoice_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO service_role;
