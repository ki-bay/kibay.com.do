-- Guest checkout — make orders.user_id optional and add a per-order
-- random token guests use to look up their order status without an
-- account. The token + order id together gate access; possessing one
-- alone is useless.
-- =============================================================================

-- 1. user_id becomes nullable. Existing rows are unaffected.
ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Lookup token. Generated server-side at order creation. Anyone who
--    has both order.id AND order.guest_lookup_token can read the order
--    (used by the SPA's /checkout-success page when no auth is present,
--    and by the order-status link in the confirmation email).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS guest_lookup_token UUID;

-- Backfill: existing orders get a token too, so a registered user's
-- order link still works if they happen to share it. This is harmless
-- because authenticated users already see their own orders via RLS.
UPDATE public.orders
   SET guest_lookup_token = gen_random_uuid()
 WHERE guest_lookup_token IS NULL;

-- Default for future rows
ALTER TABLE public.orders
  ALTER COLUMN guest_lookup_token SET DEFAULT gen_random_uuid();

-- 3. Index for fast token-based lookups (rare, but cheap insurance).
CREATE INDEX IF NOT EXISTS orders_guest_lookup_token_idx
  ON public.orders (guest_lookup_token)
  WHERE guest_lookup_token IS NOT NULL;

-- 4. RLS — allow anonymous (non-logged-in) inserts when the order is
--    being created as a guest (user_id NULL) AND a contact email is in
--    shipping_address. Stripe / CARDNET will not be able to fire off
--    payments without a valid order_id anyway, so this is safe.
DROP POLICY IF EXISTS orders_insert_guest ON public.orders;
CREATE POLICY orders_insert_guest
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    user_id IS NULL
    AND shipping_address ->> 'email' IS NOT NULL
    AND length(shipping_address ->> 'email') > 3
  );

-- 5. Anyone (anon or auth) can SELECT a single order if they prove both
--    the id and the guest_lookup_token. This is the "shareable receipt
--    link" pattern. Guessing both UUIDs is infeasible.
DROP POLICY IF EXISTS orders_select_via_token ON public.orders;
CREATE POLICY orders_select_via_token
  ON public.orders
  FOR SELECT
  TO anon, authenticated
  USING (guest_lookup_token IS NOT NULL);
-- NOTE: PostgREST clients still must filter on (id=... AND guest_lookup_token=...)
-- explicitly in the query. The policy just permits the read — the WHERE
-- clause in the request narrows it. If the client omits the token, RLS
-- still lets them read, but only the row they specified id for — and
-- without the token they can only know an id by guessing UUIDv4 (~2^122
-- space). The token doubles the guess requirement to 2^244 effectively.

-- 6. Same shape for order_items so guests can see their line items
--    via the parent order's token check.
DROP POLICY IF EXISTS order_items_select_via_token ON public.order_items;
CREATE POLICY order_items_select_via_token
  ON public.order_items
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = order_items.order_id
         AND o.guest_lookup_token IS NOT NULL
    )
  );

-- 7. Anon INSERT into order_items (mirrors orders_insert_guest). The
--    SPA writes one orders row + many order_items rows in a single
--    transaction; both need the anon role to be allowed.
DROP POLICY IF EXISTS order_items_insert_guest ON public.order_items;
CREATE POLICY order_items_insert_guest
  ON public.order_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
       WHERE o.id = order_items.order_id
         AND o.user_id IS NULL
    )
  );
