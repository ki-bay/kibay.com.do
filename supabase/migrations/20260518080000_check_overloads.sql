CREATE OR REPLACE FUNCTION public.kibay_diag_overloads()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_agg(jsonb_build_object('proname', proname, 'identargs', pg_catalog.pg_get_function_identity_arguments(p.oid)))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND proname = 'get_order_by_token';
$$;
GRANT EXECUTE ON FUNCTION public.kibay_diag_overloads() TO service_role;
