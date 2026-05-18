CREATE OR REPLACE FUNCTION public.kibay_diag_orders_policies()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_agg(jsonb_build_object('policyname', policyname, 'cmd', cmd, 'roles', roles, 'qual', qual, 'with_check', with_check))
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders';
$$;
REVOKE ALL ON FUNCTION public.kibay_diag_orders_policies() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kibay_diag_orders_policies() TO service_role;
