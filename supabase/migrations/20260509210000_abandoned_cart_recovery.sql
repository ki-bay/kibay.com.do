-- Abandoned-cart recovery: track when we've sent the recovery email, and
-- (best-effort) schedule a 15-minute pg_cron sweep that calls the
-- `send-abandoned-cart-emails` Edge Function via pg_net.
--
-- Manual fallback (works without pg_cron / pg_net):
--   curl -X POST \
--     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
--     "$SUPABASE_URL/functions/v1/send-abandoned-cart-emails"
-- or:
--   npx supabase functions invoke send-abandoned-cart-emails

-- ---------------------------------------------------------------------------
-- 1. Track recovery email status on orders.
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recovery_email_sent_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2. Schedule the recovery sweep every 15 minutes.
--    Requires both pg_cron and pg_net. If either is unavailable, skip with a
--    notice — the Edge Function still works when invoked manually.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not enabled — abandoned-cart cron skipped. Enable pg_cron in Supabase Dashboard → Database → Extensions, then re-apply this migration. The Edge Function still works when invoked manually.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net not enabled — abandoned-cart cron skipped (pg_cron alone cannot call HTTP). Enable pg_net in Supabase Dashboard → Database → Extensions, then re-apply this migration. The Edge Function still works when invoked manually.';
    RETURN;
  END IF;

  -- Drop any prior schedule with this name so re-applying the migration is safe.
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'send_abandoned_cart_emails_15min';

  -- These custom GUCs may or may not be set on the database. If not set,
  -- current_setting(..., true) returns NULL, in which case we fall back to
  -- the project URL hardcoded below and skip the schedule (we don't want to
  -- bake the service-role key into a migration).
  v_supabase_url := COALESCE(
    current_setting('app.supabase_url', true),
    'https://bsnxwajuqkatrmgoqcnu.supabase.co'
  );
  v_service_key := current_setting('app.service_role_key', true);

  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE NOTICE 'app.service_role_key GUC not set — abandoned-cart cron skipped. Set it with: ALTER DATABASE postgres SET app.service_role_key = ''<service-role-key>''; (and optionally app.supabase_url) then re-apply this migration. The Edge Function still works when invoked manually.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'send_abandoned_cart_emails_15min',
    '*/15 * * * *',
    format(
      $cron$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Authorization', 'Bearer ' || %L, 'Content-Type', 'application/json'),
        body := '{}'::jsonb
      )$cron$,
      v_supabase_url || '/functions/v1/send-abandoned-cart-emails',
      v_service_key
    )
  );
END
$$;
