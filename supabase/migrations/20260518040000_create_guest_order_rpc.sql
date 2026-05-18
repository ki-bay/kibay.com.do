-- create_guest_order — atomic INSERT for guests that also returns the
-- generated id + guest_lookup_token.
-- =============================================================================
-- The naive pattern of "INSERT ... RETURNING *" via PostgREST with
-- Prefer: return=representation requires anon to have SELECT on the row,
-- which we've intentionally locked down (orders contain customer PII).
-- This SECURITY DEFINER RPC inserts the order + items in a single
-- transaction and returns only what the SPA needs.

CREATE OR REPLACE FUNCTION public.create_guest_order(
  p_order jsonb,
  p_items jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_id UUID;
  v_token UUID;
  v_email TEXT;
BEGIN
  -- Reject obvious bad payloads early.
  v_email := p_order #>> '{shipping_address,email}';
  IF v_email IS NULL OR length(v_email) < 3 THEN
    RAISE EXCEPTION 'shipping_address.email is required';
  END IF;

  -- Force user_id to NULL — this RPC is the guest path only. Authenticated
  -- users use the normal supabase-js insert via orders_insert_own RLS.
  INSERT INTO public.orders (
    order_number,
    status,
    user_id,
    total_amount,
    subtotal_amount,
    shipping_amount,
    discount_amount,
    coupon_code,
    currency,
    items_count,
    shipping_address,
    shipping_method,
    tax_id,
    payment_method,
    estimated_delivery_date
  )
  SELECT
    p_order ->> 'order_number',
    COALESCE(p_order ->> 'status', 'awaiting_payment'),
    NULL,
    (p_order ->> 'total_amount')::numeric,
    (p_order ->> 'subtotal_amount')::numeric,
    COALESCE((p_order ->> 'shipping_amount')::numeric, 0),
    COALESCE((p_order ->> 'discount_amount')::numeric, 0),
    p_order ->> 'coupon_code',
    COALESCE(p_order ->> 'currency', 'DOP'),
    (p_order ->> 'items_count')::int,
    p_order -> 'shipping_address',
    p_order ->> 'shipping_method',
    p_order ->> 'tax_id',
    COALESCE(p_order ->> 'payment_method', 'Stripe'),
    CASE WHEN p_order ? 'estimated_delivery_date'
         THEN (p_order ->> 'estimated_delivery_date')::timestamptz
         ELSE NULL END
  RETURNING id, guest_lookup_token INTO v_order_id, v_token;

  -- Insert items in one shot.
  INSERT INTO public.order_items (
    order_id, product_id, variant_id, product_name,
    quantity, price_per_item, total_price, metadata
  )
  SELECT
    v_order_id,
    (item ->> 'product_id')::uuid,
    (item ->> 'variant_id')::uuid,
    item ->> 'product_name',
    (item ->> 'quantity')::int,
    (item ->> 'price_per_item')::int,
    (item ->> 'total_price')::int,
    COALESCE(item -> 'metadata', '{}'::jsonb)
  FROM jsonb_array_elements(p_items) AS item;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'guest_lookup_token', v_token
  );
END $$;

REVOKE ALL ON FUNCTION public.create_guest_order(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_guest_order(jsonb, jsonb) TO anon, authenticated;
