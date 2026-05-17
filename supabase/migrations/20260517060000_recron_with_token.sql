CREATE OR REPLACE FUNCTION public._kibay_recron(p_token text)
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
      v_url, p_token
    )
  );
  RETURN 'rescheduled';
END $$;
GRANT EXECUTE ON FUNCTION public._kibay_recron(text) TO service_role;
