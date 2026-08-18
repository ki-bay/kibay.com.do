-- Order status state machine — server-side enforcement.
--
-- Today `orders.status` is only constrained to be one of 9 known strings
-- (orders_status_check, 20260509120000_phase_a_payment_safety.sql). Nothing
-- stops an illegal TRANSITION — e.g. an admin (or a bug, or direct table-
-- editor access) setting a 'delivered' order back to 'awaiting_payment'.
--
-- This adds a directed allow-list of legal (from_status, to_status) pairs
-- and a BEFORE UPDATE trigger that rejects anything not on the list. The
-- admin UI's guarded action buttons are the convenience layer on top of
-- this — this trigger is the actual correctness guarantee, since it holds
-- even if the UI is bypassed.

CREATE TABLE IF NOT EXISTS public.order_status_transitions (
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  PRIMARY KEY (from_status, to_status)
);

ALTER TABLE public.order_status_transitions ENABLE ROW LEVEL SECURITY;
-- No policies — nobody needs anon/authenticated access to this table, only
-- the trigger function (which runs as the table owner, not through RLS).

INSERT INTO public.order_status_transitions (from_status, to_status) VALUES
  ('awaiting_payment', 'paid'),
  ('awaiting_payment', 'failed'),
  ('awaiting_payment', 'canceled'),
  ('paid', 'processing'),
  ('paid', 'refunded'),
  ('paid', 'canceled'),
  ('processing', 'shipped'),
  ('processing', 'refunded'),
  ('shipped', 'delivered'),
  ('shipped', 'refunded'),
  ('delivered', 'refunded'),
  -- Manual re-open escape hatch (admin override, confirm-dialog gated in the
  -- UI) — a customer insists they paid, or a decline needs re-trying.
  ('failed', 'awaiting_payment'),
  ('canceled', 'awaiting_payment'),
  -- Reachable only via the same manual-override path — no CardNet dispute
  -- webhook exists today, so this never fires automatically (see plan §1.2).
  ('paid', 'disputed'),
  ('processing', 'disputed'),
  ('shipped', 'disputed'),
  ('delivered', 'disputed'),
  ('disputed', 'refunded')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.enforce_order_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.order_status_transitions
      WHERE from_status = OLD.status AND to_status = NEW.status
    ) THEN
      RAISE EXCEPTION 'Illegal order status transition: % -> % (order %)',
        OLD.status, NEW.status, OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_enforce_status_transition ON public.orders;
CREATE TRIGGER orders_enforce_status_transition
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_order_status_transition();
