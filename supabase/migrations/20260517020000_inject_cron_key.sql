-- Helper to inject the live service_role_key into the abandoned-cart cron
-- job command. The key never enters git — we apply this migration, call the
-- RPC once with the real key, then drop the helper in the next migration.
-- Once injected the key lives in cron.job.command (admin-only visibility).

CREATE OR REPLACE FUNCTION public._kibay_set_cron_key(p_key text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url text := 'https://bsnxwajuqkatrmgoqcnu.supabase.co/functions/v1/send-abandoned-cart-emails';
BEGIN
  PERFORM cron.unschedule('kibay_abandoned_cart_sweep')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='kibay_abandoned_cart_sweep');

  PERFORM cron.schedule(
    'kibay_abandoned_cart_sweep',
    '*/15 * * * *',
    format(
      $job$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L),
        body := '{}'::jsonb
      );
      $job$,
      v_url, p_key
    )
  );
  RETURN 'scheduled';
END $$;
GRANT EXECUTE ON FUNCTION public._kibay_set_cron_key(text) TO service_role;
