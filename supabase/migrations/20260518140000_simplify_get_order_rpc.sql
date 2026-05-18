-- Reduce get_order_by_token to its essentials. Pull the order and items
-- with separate explicit UUID-typed queries — no inline expressions in
-- joins, no jsonb_agg with || chained.

DROP FUNCTION IF EXISTS public.get_order_by_token(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_order_by_token(p_id TEXT, p_token TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_id UUID;
  v_token UUID;
  v_order jsonb := NULL;
  v_items jsonb := '[]'::jsonb;
BEGIN
  BEGIN
    v_id := p_id::UUID;
    v_token := p_token::UUID;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  SELECT row_to_json(o)::jsonb INTO v_order
    FROM public.orders o
   WHERE o.id = v_id
     AND o.guest_lookup_token = v_token;

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
        'products', CASE
          WHEN p.id IS NOT NULL THEN jsonb_build_object('type', p.type)
          ELSE NULL
        END
      )
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = v_id;

  RETURN jsonb_build_object('order', v_order, 'items', v_items);
END $$;

REVOKE ALL ON FUNCTION public.get_order_by_token(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_by_token(TEXT, TEXT) TO anon, authenticated;
