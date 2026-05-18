CREATE OR REPLACE FUNCTION public.kibay_diag_cols()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_agg(jsonb_build_object('column', column_name, 'type', data_type))
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders'
    AND column_name IN ('id', 'guest_lookup_token', 'user_id');
$$;
GRANT EXECUTE ON FUNCTION public.kibay_diag_cols() TO service_role;
