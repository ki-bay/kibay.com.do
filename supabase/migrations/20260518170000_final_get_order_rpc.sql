-- Restore full get_order_by_token with items + products.type, working
-- around the schema oddity that order_items.product_id is TEXT but
-- products.id is UUID. Explicit text-to-uuid cast on the join key.

DROP FUNCTION IF EXISTS public.get_order_by_token(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_order_by_token(p_id TEXT, p_token TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_id UUID;
  v_token UUID;
  v_order jsonb;
  v_items jsonb := '[]'::jsonb;
BEGIN
  BEGIN
    v_id := p_id::UUID;
    v_token := p_token::UUID;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  SELECT to_jsonb(o.*) INTO v_order
    FROM public.orders o
   WHERE o.id = v_id AND o.guest_lookup_token = v_token
   LIMIT 1;

  IF v_order IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'product_name', oi.product_name,
        'quantity', oi.quantity,
        'price_per_item', oi.price_per_item,
        'total_price', oi.total_price,
        'metadata', oi.metadata,
        'products', CASE WHEN p.id IS NOT NULL THEN jsonb_build_object('type', p.type) ELSE NULL END
      )
    ),
    '[]'::jsonb
  ) INTO v_items
  FROM public.order_items oi
  -- order_items.product_id is TEXT but products.id is UUID; cast for join
  LEFT JOIN public.products p ON p.id::TEXT = oi.product_id
  WHERE oi.order_id = v_id;

  RETURN jsonb_build_object('order', v_order, 'items', v_items);
END $$;

REVOKE ALL ON FUNCTION public.get_order_by_token(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_by_token(TEXT, TEXT) TO anon, authenticated;
