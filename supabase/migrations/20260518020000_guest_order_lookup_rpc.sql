-- Guest order lookup — security tightening.
-- =============================================================================
-- The previous migration added an RLS SELECT policy on orders/order_items
-- conditioned only on guest_lookup_token IS NOT NULL. That's too permissive:
-- anon could read ANY order by id alone without the token (PostgREST's WHERE
-- clause isn't a security gate, it's a filter choice).
--
-- Fix: drop the open SELECT policy and replace with a SECURITY DEFINER RPC
-- that takes (id, token) and only returns the row when BOTH match. Anon
-- has no direct SELECT on orders anymore — they must use the RPC.

DROP POLICY IF EXISTS orders_select_via_token ON public.orders;
DROP POLICY IF EXISTS order_items_select_via_token ON public.order_items;

-- One RPC, returns JSON: { order: {...}, items: [...] }. Returns NULL if
-- token doesn't match. Grants EXECUTE to anon + authenticated so logged-in
-- users can also use it (handy for /checkout-success after a registered
-- purchase where the URL still has token=… from the redirect).
CREATE OR REPLACE FUNCTION public.get_order_by_token(p_id UUID, p_token UUID)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_order jsonb;
  v_items jsonb;
BEGIN
  SELECT to_jsonb(o) INTO v_order
    FROM public.orders o
   WHERE o.id = p_id
     AND o.guest_lookup_token = p_token
   LIMIT 1;

  IF v_order IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(oi) ||
           CASE WHEN p IS NULL THEN '{}'::jsonb
                ELSE jsonb_build_object('products', jsonb_build_object('type', p.type))
           END
         ), '[]'::jsonb) INTO v_items
    FROM public.order_items oi
    LEFT JOIN public.products p ON p.id = oi.product_id
   WHERE oi.order_id = p_id;

  RETURN jsonb_build_object('order', v_order, 'items', v_items);
END $$;

REVOKE ALL ON FUNCTION public.get_order_by_token(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_by_token(UUID, UUID) TO anon, authenticated;
