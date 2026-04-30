-- Phase 1: Native product catalog in Supabase (replaces Hostinger E-commerce API).
--
-- Decisions:
--   * Bilingual (ES default / EN secondary): every user-visible text column is paired _es/_en.
--   * Bilingual pricing: each variant carries USD price (English) and DOP price (Spanish) — no FX math.
--   * URLs by slug (e.g. /product/kibay-sparkling), not opaque IDs.
--   * Real inventory: integer quantity per variant, decremented automatically when an order goes paid.

-- ---------------------------------------------------------------------------
-- product_collections (categories: Sparkling, Fermented, …)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_es TEXT,
  description_en TEXT,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_collections_read_all
  ON public.product_collections FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY product_collections_admin_all
  ON public.product_collections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,

  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  subtitle_es TEXT,
  subtitle_en TEXT,
  ribbon_text_es TEXT,
  ribbon_text_en TEXT,
  description_es TEXT,
  description_en TEXT,

  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  purchasable BOOLEAN NOT NULL DEFAULT true,
  type TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS products_status_sort_idx ON public.products (status, sort_order);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select_published_or_admin
  ON public.products FOR SELECT TO anon, authenticated
  USING (
    status = 'published'
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY products_admin_all
  ON public.products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- ---------------------------------------------------------------------------
-- product_images
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_images_product_idx ON public.product_images (product_id, sort_order);

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_images_select
  ON public.product_images FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published')
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY product_images_admin_all
  ON public.product_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- ---------------------------------------------------------------------------
-- product_variants
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,

  title_es TEXT NOT NULL DEFAULT 'Predeterminado',
  title_en TEXT NOT NULL DEFAULT 'Default',
  sku TEXT,

  -- Bilingual pricing (cents). Both required so the site can display either currency.
  price_usd_cents INTEGER NOT NULL,
  sale_price_usd_cents INTEGER,
  price_dop_cents INTEGER NOT NULL,
  sale_price_dop_cents INTEGER,

  -- Inventory
  inventory_quantity INTEGER NOT NULL DEFAULT 0,
  manage_inventory BOOLEAN NOT NULL DEFAULT true,
  allow_backorder BOOLEAN NOT NULL DEFAULT false,

  weight_grams INTEGER,
  image_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_variants_product_idx ON public.product_variants (product_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_uidx ON public.product_variants (sku) WHERE sku IS NOT NULL;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_variants_select
  ON public.product_variants FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published')
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY product_variants_admin_all
  ON public.product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- ---------------------------------------------------------------------------
-- product_collection_assignments (M:N)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_collection_assignments (
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.product_collections (id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, collection_id)
);

ALTER TABLE public.product_collection_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_collection_assignments_read_all
  ON public.product_collection_assignments FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY product_collection_assignments_admin_all
  ON public.product_collection_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- ---------------------------------------------------------------------------
-- product_additional_info (FAQ-style sections per product: policies, ingredients, shipping, …)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_additional_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  title_es TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_es TEXT,
  description_en TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS product_additional_info_product_idx ON public.product_additional_info (product_id, sort_order);

ALTER TABLE public.product_additional_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_additional_info_select
  ON public.product_additional_info FOR SELECT TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published')
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY product_additional_info_admin_all
  ON public.product_additional_info FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin'));

-- ---------------------------------------------------------------------------
-- orders / order_items integration
-- ---------------------------------------------------------------------------

-- Currency on the order (USD or DOP — selected at checkout based on UI language).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','DOP'));

-- Link order items to native variants (nullable for legacy/Hostinger rows).
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS order_items_variant_idx ON public.order_items (variant_id);

-- ---------------------------------------------------------------------------
-- Inventory auto-decrement when order is marked paid
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_inventory_on_paid()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Only on the transition INTO 'paid' (idempotent across other status changes).
  IF (NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid')) THEN
    UPDATE public.product_variants pv
    SET inventory_quantity = pv.inventory_quantity - oi.quantity,
        updated_at = now()
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND oi.variant_id = pv.id
      AND pv.manage_inventory = true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_decrement_inventory ON public.orders;
CREATE TRIGGER orders_decrement_inventory
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_inventory_on_paid();

-- ---------------------------------------------------------------------------
-- Storage bucket for product images
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('product_images', 'product_images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY product_images_storage_public_read
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'product_images');

CREATE POLICY product_images_storage_admin_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product_images'
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY product_images_storage_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product_images'
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY product_images_storage_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product_images'
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- Seed: 2 collections matching the Hostinger taxonomy (Sparkling, Fermented).
-- ---------------------------------------------------------------------------
INSERT INTO public.product_collections (slug, title_es, title_en, sort_order)
VALUES
  ('sparkling',  'Espumante', 'Sparkling',  0),
  ('fermented', 'Fermentado', 'Fermented',  1)
ON CONFLICT (slug) DO NOTHING;
