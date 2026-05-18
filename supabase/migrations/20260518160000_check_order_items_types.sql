CREATE OR REPLACE FUNCTION public.kibay_diag_oi_cols()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_agg(jsonb_build_object('column', column_name, 'type', data_type))
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'order_items';
$$;
GRANT EXECUTE ON FUNCTION public.kibay_diag_oi_cols() TO service_role;
