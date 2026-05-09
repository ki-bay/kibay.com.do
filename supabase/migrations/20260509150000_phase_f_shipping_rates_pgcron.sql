-- Phase F: shipping_rates table (admin-editable) + pg_cron stale-order cleanup.

-- ---------------------------------------------------------------------------
-- shipping_rates: one row per currency, holding the standard/express tier
-- amounts plus the "free over" threshold. Used by computeShippingMajor on the
-- checkout page; replaces the hardcoded values in src/lib/shipping.js.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  currency TEXT PRIMARY KEY CHECK (currency IN ('USD','DOP')),
  free_over_cents INTEGER NOT NULL CHECK (free_over_cents >= 0),
  standard_cents INTEGER NOT NULL CHECK (standard_cents >= 0),
  express_cents INTEGER NOT NULL CHECK (express_cents >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed with the current hardcoded tiers (only if empty).
INSERT INTO public.shipping_rates (currency, free_over_cents, standard_cents, express_cents)
VALUES
  ('DOP', 500000, 20000, 40000),
  ('USD',   9000,   400,   800)
ON CONFLICT (currency) DO NOTHING;

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shipping_rates_public_read ON public.shipping_rates;
CREATE POLICY shipping_rates_public_read
  ON public.shipping_rates
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS shipping_rates_admin_write ON public.shipping_rates;
CREATE POLICY shipping_rates_admin_write
  ON public.shipping_rates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.role = 'admin' OR u.email = 'info@kibay.com.do')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.role = 'admin' OR u.email = 'info@kibay.com.do')
    )
  );

-- ---------------------------------------------------------------------------
-- pg_cron: hourly cleanup of orders stuck in 'awaiting_payment' for > 1h.
-- The function itself was added in 20260509120000_phase_a_payment_safety.sql.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Try to enable pg_cron. On some Supabase plans this needs to be enabled
  -- in the dashboard first; in that case the migration leaves the schedule
  -- step a no-op rather than failing.
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'pg_cron extension not enabled — skipping schedule. Enable it in Supabase Dashboard → Database → Extensions, then re-apply this migration.';
      RETURN;
    END;
  END IF;

  -- Only schedule if pg_cron is now present.
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule any prior version so re-applying the migration is safe.
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'cancel_stale_awaiting_payment_orders_hourly';

    PERFORM cron.schedule(
      'cancel_stale_awaiting_payment_orders_hourly',
      '0 * * * *',  -- every hour on the hour
      $cron$SELECT public.cancel_stale_awaiting_payment_orders(60)$cron$
    );
  END IF;
END
$$;
