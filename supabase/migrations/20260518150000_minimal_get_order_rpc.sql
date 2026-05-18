-- Strip get_order_by_token to absolute minimum to isolate the
-- "operator does not exist: uuid = text" error.

DROP FUNCTION IF EXISTS public.get_order_by_token(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_order_by_token(p_id TEXT, p_token TEXT)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_id UUID;
  v_token UUID;
BEGIN
  v_id := p_id::UUID;
  v_token := p_token::UUID;

  SELECT * INTO v_order
    FROM public.orders
   WHERE id = v_id AND guest_lookup_token = v_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object('order', to_jsonb(v_order), 'items', '[]'::jsonb);
END $$;

REVOKE ALL ON FUNCTION public.get_order_by_token(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_by_token(TEXT, TEXT) TO anon, authenticated;
