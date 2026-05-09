-- Phase E: small admin schema additions.

-- 1. Internal notes on orders. Visible only to admins (RLS on orders already
--    restricts non-admin SELECT to the row's own user_id, so non-admin
--    customers won't even fetch this column when reading their order).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- 2. Admin DELETE policy on newsletter_subscribers (the original migration
--    granted INSERT/UPDATE to anon+authenticated and SELECT to authenticated
--    but never wrote a DELETE policy, so any DELETE was implicitly denied).
DROP POLICY IF EXISTS newsletter_subscribers_admin_delete ON public.newsletter_subscribers;
CREATE POLICY newsletter_subscribers_admin_delete
  ON public.newsletter_subscribers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.role = 'admin' OR u.email = 'info@kibay.com.do')
    )
  );
