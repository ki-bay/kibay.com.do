-- E-commerce order fields, admin role, and policies (additive; safe to re-run)

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'customer';

COMMENT ON COLUMN public.users.role IS 'customer | admin — admins get elevated order policies.';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS tax_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_method TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invoice_pdf_path TEXT,
  ADD COLUMN IF NOT EXISTS subtotal_amount INTEGER,
  ADD COLUMN IF NOT EXISTS shipping_amount INTEGER;

CREATE INDEX IF NOT EXISTS orders_stripe_pi_idx ON public.orders (stripe_payment_intent_id);

-- Promote store owner to admin when their profile row exists (idempotent).
UPDATE public.users
SET role = 'admin'
WHERE lower(coalesce(email, '')) = lower('info@kibay.com.do');

-- Admins: read/update any order (shipping, status, tracking).
CREATE POLICY orders_admin_select
  ON public.orders FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY orders_admin_update
  ON public.orders FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY order_items_admin_select
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY order_items_admin_update
  ON public.order_items FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );
