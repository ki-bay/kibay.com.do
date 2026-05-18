CREATE OR REPLACE FUNCTION public.kibay_diag_all_funcs()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_agg(jsonb_build_object('oid', p.oid::int, 'proname', proname, 'identargs', pg_catalog.pg_get_function_identity_arguments(p.oid), 'src_preview', left(prosrc, 300)))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND proname IN ('get_order_by_token', 'create_guest_order');
$$;
GRANT EXECUTE ON FUNCTION public.kibay_diag_all_funcs() TO service_role;
