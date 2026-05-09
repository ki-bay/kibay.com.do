-- Product reviews + ratings
-- Public read of approved reviews, authenticated insert/edit/delete of own,
-- and full admin moderation. Idempotent (safe to re-run).

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewer_name TEXT,                          -- denormalized so deleted users keep displayable names
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  comment TEXT,
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  approved BOOLEAN NOT NULL DEFAULT true,      -- demo project, auto-approve; admin can flip false to hide
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_reviews_product_idx
  ON public.product_reviews(product_id, created_at DESC);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Public reads only approved reviews
DROP POLICY IF EXISTS product_reviews_public_read ON public.product_reviews;
CREATE POLICY product_reviews_public_read ON public.product_reviews
  FOR SELECT TO anon, authenticated
  USING (approved = true);

-- Authenticated users insert (their own user_id only)
DROP POLICY IF EXISTS product_reviews_user_insert ON public.product_reviews;
CREATE POLICY product_reviews_user_insert ON public.product_reviews
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Authenticated users update their own
DROP POLICY IF EXISTS product_reviews_user_update ON public.product_reviews;
CREATE POLICY product_reviews_user_update ON public.product_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Authenticated users delete their own
DROP POLICY IF EXISTS product_reviews_user_delete ON public.product_reviews;
CREATE POLICY product_reviews_user_delete ON public.product_reviews
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Admin can do anything (moderation)
DROP POLICY IF EXISTS product_reviews_admin_all ON public.product_reviews;
CREATE POLICY product_reviews_admin_all ON public.product_reviews
  FOR ALL TO authenticated
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
