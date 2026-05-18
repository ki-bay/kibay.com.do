CREATE OR REPLACE FUNCTION public.kibay_cron_run_history()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_agg(rec) FROM (
    SELECT
      j.jobname,
      r.start_time,
      r.end_time,
      r.status,
      r.return_message
    FROM cron.job_run_details r
    JOIN cron.job j ON j.jobid = r.jobid
    WHERE j.jobname LIKE 'kibay%'
    ORDER BY r.start_time DESC
    LIMIT 10
  ) rec;
$$;
REVOKE ALL ON FUNCTION public.kibay_cron_run_history() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kibay_cron_run_history() TO service_role;
