CREATE OR REPLACE FUNCTION public.kibay_cron_status()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_agg(jsonb_build_object('jobname', jobname, 'schedule', schedule, 'active', active))
  FROM cron.job;
$$;
REVOKE ALL ON FUNCTION public.kibay_cron_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kibay_cron_status() TO service_role;
