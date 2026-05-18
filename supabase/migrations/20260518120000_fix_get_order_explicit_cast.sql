-- Replace get_order_by_token with explicit casts inside the WHERE
-- clause. The previous version assigned to UUID variables before the
-- query, but somehow still triggered "operator does not exist: uuid = text".
-- Explicit p_id::UUID inside the WHERE eliminates any ambiguity.

DROP FUNCTION IF EXISTS public.get_order_by_token(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_order_by_token(p_id TEXT, p_token TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_order jsonb;
  v_items jsonb;
BEGIN
  BEGIN
    PERFORM p_id::UUID, p_token::UUID;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  SELECT to_jsonb(o) INTO v_order
    FROM public.orders o
   WHERE o.id::TEXT = p_id
     AND o.guest_lookup_token::TEXT = p_token
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
   WHERE oi.order_id::TEXT = p_id;

  RETURN jsonb_build_object('order', v_order, 'items', v_items);
END $$;

REVOKE ALL ON FUNCTION public.get_order_by_token(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_by_token(TEXT, TEXT) TO anon, authenticated;
