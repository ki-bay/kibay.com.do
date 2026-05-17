-- Schedule the abandoned-cart cron with a caller-supplied token.
-- The underscored helper used previously was hidden from PostgREST.

CREATE OR REPLACE FUNCTION public.kibay_schedule_cart_cron(p_token text)
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
  RETURN 'scheduled';
END $$;

REVOKE ALL ON FUNCTION public.kibay_schedule_cart_cron(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.kibay_schedule_cart_cron(text) TO service_role;
