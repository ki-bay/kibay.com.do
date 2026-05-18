-- Helper to register the hourly stuck-orders alert cron. Same pattern as
-- the abandoned-cart cron: caller supplies the token via RPC so it's never
-- committed to git. The cron command embeds the token directly (admin-only
-- visibility via cron.job.command).

CREATE OR REPLACE FUNCTION public.kibay_schedule_stuck_orders_cron(p_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_url text := 'https://bsnxwajuqkatrmgoqcnu.supabase.co/functions/v1/alert-stuck-orders';
BEGIN
  PERFORM cron.unschedule('kibay_stuck_orders_alert')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='kibay_stuck_orders_alert');

  -- Hourly at :10 (10 min after the top, so it runs AFTER the
  -- cancel_stale_awaiting_payment_orders_hourly job that runs at :00 —
  -- avoids alerting on orders that are about to be auto-canceled).
  PERFORM cron.schedule(
    'kibay_stuck_orders_alert',
    '10 * * * *',
    format(
      $job$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || %L),
        body := '{}'::jsonb
      );
      $job$,
      v_url, p_token
    )
  );
  RETURN 'scheduled';
END $$;

REVOKE ALL ON FUNCTION public.kibay_schedule_stuck_orders_cron(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kibay_schedule_stuck_orders_cron(text) TO service_role;
