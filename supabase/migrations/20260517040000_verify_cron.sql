CREATE OR REPLACE FUNCTION public._kibay_verify_cron()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_agg(jsonb_build_object('jobname', jobname, 'schedule', schedule, 'active', active))
  FROM cron.job
  WHERE jobname LIKE 'kibay%';
$$;
GRANT EXECUTE ON FUNCTION public._kibay_verify_cron() TO service_role;
