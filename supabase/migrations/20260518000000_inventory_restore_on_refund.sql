-- Inventory restoration on refund / cancel.
-- =============================================================================
-- The original decrement_inventory_on_paid trigger (in
-- 20260430120000_product_catalog.sql) handles paid → stock-down. It does NOT
-- handle paid → refunded or paid → cancelled, so a refunded order would
-- permanently destroy that stock (item shows out-of-stock until manually
-- bumped in admin). This migration adds the inverse trigger.
--
-- Idempotency: only restores when transitioning OUT of 'paid' into one
-- of the refund/cancel states. Repeated UPDATE statements with the same
-- target status don't fire the inventory bump.

CREATE OR REPLACE FUNCTION public.restore_inventory_on_refund_or_cancel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.status = 'paid' AND NEW.status IN ('refunded', 'cancelled', 'canceled')) THEN
    UPDATE public.product_variants pv
    SET inventory_quantity = pv.inventory_quantity + oi.quantity,
        updated_at = now()
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.variant_id = pv.id
      AND pv.manage_inventory = true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_restore_inventory ON public.orders;
CREATE TRIGGER orders_restore_inventory
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_inventory_on_refund_or_cancel();
