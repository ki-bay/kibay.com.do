-- Discount codes (coupons) feature.
--
-- Storage:
--   1. public.coupons         — admin-managed code definitions, RLS-locked.
--   2. public.orders columns  — coupon_code + discount_amount (additive, nullable).
--
-- Read path:
--   public.validate_coupon(code, subtotal, currency) — pure check, no writes.
--
-- Write path:
--   public.redeem_coupon(code, subtotal, currency)   — locks row, validates,
--                                                     then increments uses_count.
--
-- Both RPCs return (valid boolean, error text, discount_amount integer, coupon_id uuid).
-- Customers cannot SELECT public.coupons directly; they must call the RPCs.
--
-- Migration is idempotent (CREATE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS,
-- CREATE OR REPLACE FUNCTION, DROP TRIGGER IF EXISTS … CREATE TRIGGER).

-- ---------------------------------------------------------------------------
-- 1. coupons table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT NOT NULL UNIQUE,
  description      TEXT,
  discount_type    TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value   INTEGER NOT NULL CHECK (discount_value > 0),
  currency         TEXT CHECK (currency IN ('USD','DOP')),
  min_order_amount INTEGER,
  max_uses         INTEGER,
  uses_count       INTEGER NOT NULL DEFAULT 0,
  starts_at        TIMESTAMPTZ,
  ends_at          TIMESTAMPTZ,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- code must be uppercase (the BEFORE INSERT/UPDATE trigger enforces this,
  -- but the CHECK is belt-and-suspenders for direct SQL inserts).
  CONSTRAINT coupons_code_upper_chk
    CHECK (code = upper(code) AND length(code) > 0),

  -- percent discounts: 1..100, currency must be NULL.
  -- fixed discounts:   currency required.
  CONSTRAINT coupons_percent_range_chk
    CHECK (discount_type <> 'percent' OR (discount_value BETWEEN 1 AND 100 AND currency IS NULL)),
  CONSTRAINT coupons_fixed_currency_chk
    CHECK (discount_type <> 'fixed'   OR currency IS NOT NULL),

  -- max_uses must be positive when set.
  CONSTRAINT coupons_max_uses_chk
    CHECK (max_uses IS NULL OR max_uses > 0),

  -- min_order_amount must be non-negative when set.
  CONSTRAINT coupons_min_order_amount_chk
    CHECK (min_order_amount IS NULL OR min_order_amount >= 0),

  -- start <= end when both set.
  CONSTRAINT coupons_window_chk
    CHECK (starts_at IS NULL OR ends_at IS NULL OR starts_at <= ends_at),

  -- uses_count cannot exceed max_uses.
  CONSTRAINT coupons_uses_count_chk
    CHECK (max_uses IS NULL OR uses_count <= max_uses)
);

-- Fast lookup for "is this code currently usable" (active & within window).
CREATE INDEX IF NOT EXISTS coupons_active_ends_at_idx
  ON public.coupons (active, ends_at);

-- ---------------------------------------------------------------------------
-- 2. Uppercase/trim trigger on insert/update of code
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.coupons_normalize_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.code IS NOT NULL THEN
    NEW.code := upper(trim(NEW.code));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coupons_normalize_code_trg ON public.coupons;
CREATE TRIGGER coupons_normalize_code_trg
  BEFORE INSERT OR UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.coupons_normalize_code();

-- ---------------------------------------------------------------------------
-- 3. RLS: coupons are not browsable by customers. Admin-only CRUD.
-- ---------------------------------------------------------------------------
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated SELECT policy on purpose. RLS denies by default,
-- so customers must use the RPCs (SECURITY DEFINER) to validate codes.

DROP POLICY IF EXISTS coupons_admin_select ON public.coupons;
CREATE POLICY coupons_admin_select
  ON public.coupons FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.role = 'admin' OR u.email = 'info@kibay.com.do')
    )
  );

DROP POLICY IF EXISTS coupons_admin_insert ON public.coupons;
CREATE POLICY coupons_admin_insert
  ON public.coupons FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.role = 'admin' OR u.email = 'info@kibay.com.do')
    )
  );

DROP POLICY IF EXISTS coupons_admin_update ON public.coupons;
CREATE POLICY coupons_admin_update
  ON public.coupons FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS coupons_admin_delete ON public.coupons;
CREATE POLICY coupons_admin_delete
  ON public.coupons FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND (u.role = 'admin' OR u.email = 'info@kibay.com.do')
    )
  );

-- ---------------------------------------------------------------------------
-- 4. orders: additive columns (nullable / defaulted)
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- 5. validate_coupon — read-only check
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code     TEXT,
  p_subtotal INTEGER,
  p_currency TEXT
)
RETURNS TABLE (
  valid           BOOLEAN,
  error           TEXT,
  discount_amount INTEGER,
  coupon_id       UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code     TEXT := upper(trim(coalesce(p_code, '')));
  v_currency TEXT := upper(trim(coalesce(p_currency, '')));
  c          public.coupons%ROWTYPE;
  v_discount INTEGER;
BEGIN
  -- Default failure shape; specific branches override.
  valid := false;
  error := NULL;
  discount_amount := 0;
  coupon_id := NULL;

  IF v_code = '' THEN
    error := 'Coupon code is required';
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_subtotal IS NULL OR p_subtotal < 0 THEN
    error := 'Invalid subtotal';
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT * INTO c FROM public.coupons WHERE code = v_code;
  IF NOT FOUND THEN
    error := 'Coupon not found';
    RETURN NEXT;
    RETURN;
  END IF;

  coupon_id := c.id;

  IF NOT c.active THEN
    error := 'Coupon is not active';
    RETURN NEXT;
    RETURN;
  END IF;

  IF c.starts_at IS NOT NULL AND now() < c.starts_at THEN
    error := 'Coupon is not yet active';
    RETURN NEXT;
    RETURN;
  END IF;

  IF c.ends_at IS NOT NULL AND now() > c.ends_at THEN
    error := 'Coupon has expired';
    RETURN NEXT;
    RETURN;
  END IF;

  IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN
    error := 'Coupon usage limit reached';
    RETURN NEXT;
    RETURN;
  END IF;

  IF c.min_order_amount IS NOT NULL AND p_subtotal < c.min_order_amount THEN
    error := 'Order subtotal does not meet the coupon minimum';
    RETURN NEXT;
    RETURN;
  END IF;

  IF c.discount_type = 'fixed' THEN
    IF c.currency IS DISTINCT FROM v_currency THEN
      error := 'Coupon currency does not match the order currency';
      RETURN NEXT;
      RETURN;
    END IF;
    v_discount := c.discount_value;
  ELSE
    -- percent
    v_discount := (p_subtotal * c.discount_value) / 100;
  END IF;

  -- Cap so discount never exceeds subtotal.
  IF v_discount > p_subtotal THEN
    v_discount := p_subtotal;
  END IF;
  IF v_discount < 0 THEN
    v_discount := 0;
  END IF;

  valid := true;
  error := NULL;
  discount_amount := v_discount;
  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_coupon(TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, INTEGER, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. redeem_coupon — atomic validate + uses_count++
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_code     TEXT,
  p_subtotal INTEGER,
  p_currency TEXT
)
RETURNS TABLE (
  valid           BOOLEAN,
  error           TEXT,
  discount_amount INTEGER,
  coupon_id       UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code     TEXT := upper(trim(coalesce(p_code, '')));
  v_currency TEXT := upper(trim(coalesce(p_currency, '')));
  c          public.coupons%ROWTYPE;
  v_discount INTEGER;
BEGIN
  valid := false;
  error := NULL;
  discount_amount := 0;
  coupon_id := NULL;

  IF v_code = '' THEN
    error := 'Coupon code is required';
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_subtotal IS NULL OR p_subtotal < 0 THEN
    error := 'Invalid subtotal';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Lock the row to serialize concurrent redemptions for this code.
  SELECT * INTO c FROM public.coupons WHERE code = v_code FOR UPDATE;
  IF NOT FOUND THEN
    error := 'Coupon not found';
    RETURN NEXT;
    RETURN;
  END IF;

  coupon_id := c.id;

  IF NOT c.active THEN
    error := 'Coupon is not active';
    RETURN NEXT;
    RETURN;
  END IF;

  IF c.starts_at IS NOT NULL AND now() < c.starts_at THEN
    error := 'Coupon is not yet active';
    RETURN NEXT;
    RETURN;
  END IF;

  IF c.ends_at IS NOT NULL AND now() > c.ends_at THEN
    error := 'Coupon has expired';
    RETURN NEXT;
    RETURN;
  END IF;

  IF c.max_uses IS NOT NULL AND c.uses_count >= c.max_uses THEN
    error := 'Coupon usage limit reached';
    RETURN NEXT;
    RETURN;
  END IF;

  IF c.min_order_amount IS NOT NULL AND p_subtotal < c.min_order_amount THEN
    error := 'Order subtotal does not meet the coupon minimum';
    RETURN NEXT;
    RETURN;
  END IF;

  IF c.discount_type = 'fixed' THEN
    IF c.currency IS DISTINCT FROM v_currency THEN
      error := 'Coupon currency does not match the order currency';
      RETURN NEXT;
      RETURN;
    END IF;
    v_discount := c.discount_value;
  ELSE
    v_discount := (p_subtotal * c.discount_value) / 100;
  END IF;

  IF v_discount > p_subtotal THEN
    v_discount := p_subtotal;
  END IF;
  IF v_discount < 0 THEN
    v_discount := 0;
  END IF;

  -- All checks passed: increment uses_count under the row lock.
  UPDATE public.coupons
     SET uses_count = uses_count + 1,
         updated_at = now()
   WHERE id = c.id;

  valid := true;
  error := NULL;
  discount_amount := v_discount;
  RETURN NEXT;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_coupon(TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT, INTEGER, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Optional: sample inactive coupons (commented out — uncomment to test).
-- ---------------------------------------------------------------------------
-- INSERT INTO public.coupons (code, description, discount_type, discount_value, currency, active)
-- VALUES
--   ('WELCOME10', '10% off your first order (sample, inactive)', 'percent', 10, NULL,  false),
--   ('FLAT500',   '500 cents off in USD (sample, inactive)',     'fixed',   500, 'USD', false)
-- ON CONFLICT (code) DO NOTHING;
