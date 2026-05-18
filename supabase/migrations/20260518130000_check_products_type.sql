CREATE OR REPLACE FUNCTION public.kibay_diag_products_type()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_agg(jsonb_build_object('column', column_name, 'type', data_type))
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'products'
    AND column_name IN ('id', 'type');
$$;
GRANT EXECUTE ON FUNCTION public.kibay_diag_products_type() TO service_role;
