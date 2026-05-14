-- ============================================================================
-- Low-stock alerts. A trigger on product_variants logs an alert when a
-- variant's inventory crosses below the threshold (default 5). When stock
-- is restocked above the threshold, the open alert is auto-resolved.
-- Admin UI queries `inventory_alerts WHERE resolved_at IS NULL` to surface
-- unresolved alerts. No email is sent automatically — the admin sees the
-- count on the dashboard. Email digest can be added later if needed.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id        UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  triggered_at_qty  INTEGER NOT NULL,
  threshold         INTEGER NOT NULL DEFAULT 5,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_alerts_unresolved_idx
  ON public.inventory_alerts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS inventory_alerts_variant_idx
  ON public.inventory_alerts(variant_id);
CREATE INDEX IF NOT EXISTS inventory_alerts_product_idx
  ON public.inventory_alerts(product_id);

ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_alerts_admin_all ON public.inventory_alerts;
CREATE POLICY inventory_alerts_admin_all
  ON public.inventory_alerts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- Trigger: fire when crossing the threshold downward; auto-resolve upward
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fire_low_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_threshold INTEGER := 5;
BEGIN
  -- Only meaningful when this variant manages inventory
  IF NOT NEW.manage_inventory THEN
    RETURN NEW;
  END IF;

  -- Downward crossing: log alert if not already open
  IF NEW.inventory_quantity <= v_threshold
     AND COALESCE(OLD.inventory_quantity, 999999) > v_threshold THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.inventory_alerts
      WHERE variant_id = NEW.id AND resolved_at IS NULL
    ) THEN
      INSERT INTO public.inventory_alerts (variant_id, product_id, triggered_at_qty, threshold)
      VALUES (NEW.id, NEW.product_id, NEW.inventory_quantity, v_threshold);
    END IF;
  END IF;

  -- Upward crossing: auto-resolve any open alert for this variant
  IF NEW.inventory_quantity > v_threshold
     AND COALESCE(OLD.inventory_quantity, 0) <= v_threshold THEN
    UPDATE public.inventory_alerts
       SET resolved_at = NOW()
     WHERE variant_id = NEW.id AND resolved_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS variants_low_stock_alert ON public.product_variants;
CREATE TRIGGER variants_low_stock_alert
  AFTER UPDATE OF inventory_quantity ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.fire_low_stock_alert();

-- ---------------------------------------------------------------------------
-- Backfill: open alerts for anything that's already at or below threshold
-- (so the new system doesn't pretend everything's healthy on first deploy)
-- ---------------------------------------------------------------------------
INSERT INTO public.inventory_alerts (variant_id, product_id, triggered_at_qty, threshold)
SELECT v.id, v.product_id, v.inventory_quantity, 5
FROM public.product_variants v
WHERE v.manage_inventory
  AND v.inventory_quantity <= 5
  AND NOT EXISTS (
    SELECT 1 FROM public.inventory_alerts a
    WHERE a.variant_id = v.id AND a.resolved_at IS NULL
  );
