-- Reassert admin role for the owner email + add an email-fallback clause to
-- the orders/order_items admin RLS policies.
--
-- Background:
--   The original 20260420120000 migration set role='admin' for
--   info@kibay.com.do. It got reset to 'customer' at some point between then
--   and 2026-05-27 (likely from a customer-edit UI flow that defaulted the
--   role on save). Effect: /admin/orders rendered (ProtectedAdminRoute does
--   an email check) but the data query returned 0 rows because the RLS
--   policies require role='admin'. The owner sees an empty page.
--
-- Two-pronged fix so this never silently breaks again:
--   (a) re-assert role='admin' for the owner email
--   (b) expand the admin RLS policies to accept owner-email as a fallback,
--       matching the ProtectedAdminRoute pattern already used on the frontend.

-- (a) Re-assert.
UPDATE public.users
SET role = 'admin'
WHERE email = 'info@kibay.com.do' AND role IS DISTINCT FROM 'admin';

-- (b) Rewrite admin policies with email fallback. Same RLS shape, plus an
-- OR clause that matches against the user's auth email (which can't drift
-- because it's a Supabase-managed identity field, not a public.users column
-- editable from the admin UI).
DROP POLICY IF EXISTS orders_admin_select ON public.orders;
CREATE POLICY orders_admin_select ON public.orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.role = 'admin' OR u.email = 'info@kibay.com.do')
    )
  );

DROP POLICY IF EXISTS orders_admin_update ON public.orders;
CREATE POLICY orders_admin_update ON public.orders
  FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS order_items_admin_select ON public.order_items;
CREATE POLICY order_items_admin_select ON public.order_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.role = 'admin' OR u.email = 'info@kibay.com.do')
    )
  );

DROP POLICY IF EXISTS order_items_admin_update ON public.order_items;
CREATE POLICY order_items_admin_update ON public.order_items
  FOR UPDATE TO authenticated
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
