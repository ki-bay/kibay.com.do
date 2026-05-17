-- Activate the abandoned-cart recovery cron that was lying dormant.
-- The earlier migration (20260509210000_abandoned_cart_recovery.sql) tried to
-- schedule a 15-min pg_cron sweep but no-op'd because pg_net wasn't enabled.
-- This migration:
--   1. Enables pg_net so pg_cron can call HTTP endpoints
--   2. Registers the cron job pointing at the send-abandoned-cart-emails
--      Edge Function
--   3. Drops the diagnostic helper from 20260517000000

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  v_project_ref text := 'bsnxwajuqkatrmgoqcnu';
  v_function_url text;
  v_service_role_key text;
BEGIN
  v_function_url := 'https://' || v_project_ref || '.supabase.co/functions/v1/send-abandoned-cart-emails';

  -- Read the service role key from a setting if available — in Supabase
  -- Edge cron contexts the key has to be in vault. We use the standard
  -- approach: store it via Supabase Dashboard → Project Settings → Vault
  -- under the name "service_role_key". If not present, the cron still
  -- registers but the call will 401 until the secret is set.
  BEGIN
    v_service_role_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1);
  EXCEPTION WHEN OTHERS THEN
    v_service_role_key := NULL;
  END;

  -- Remove any prior version of this job so re-running the migration is safe.
  PERFORM cron.unschedule('kibay_abandoned_cart_sweep')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'kibay_abandoned_cart_sweep');

  -- Schedule the sweep every 15 minutes. The Edge Function reads `orders`
  -- where status='awaiting_payment' AND created_at < now() - interval '1h'
  -- AND abandoned_email_sent_at IS NULL.
  PERFORM cron.schedule(
    'kibay_abandoned_cart_sweep',
    '*/15 * * * *',
    format(
      $job$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || %L
        ),
        body := '{}'::jsonb
      );
      $job$,
      v_function_url,
      COALESCE(v_service_role_key, 'MISSING_SERVICE_ROLE_KEY_IN_VAULT')
    )
  );
END $$;

-- Drop the diagnostic helper from the previous migration; no longer needed.
DROP FUNCTION IF EXISTS public._diag_extensions();
