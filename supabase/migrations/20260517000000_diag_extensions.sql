CREATE OR REPLACE FUNCTION public._diag_extensions()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'extensions', (SELECT jsonb_agg(jsonb_build_object('name', extname, 'version', extversion))
                   FROM pg_extension WHERE extname IN ('pg_cron','pg_net')),
    'cron_jobs', (SELECT jsonb_agg(jsonb_build_object('name', jobname, 'schedule', schedule, 'active', active))
                  FROM cron.job WHERE jobname ILIKE '%abandoned%' OR jobname ILIKE '%cart%' OR jobname ILIKE '%kibay%')
  );
$$;
GRANT EXECUTE ON FUNCTION public._diag_extensions() TO authenticated, service_role;
