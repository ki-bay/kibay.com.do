CREATE OR REPLACE FUNCTION public.kibay_diag_funcs()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_agg(jsonb_build_object(
    'proname', proname,
    'identargs', pg_catalog.pg_get_function_identity_arguments(p.oid),
    'src', pg_get_functiondef(p.oid)
  ))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND proname IN ('get_order_by_token','create_guest_order');
$$;
GRANT EXECUTE ON FUNCTION public.kibay_diag_funcs() TO service_role;
