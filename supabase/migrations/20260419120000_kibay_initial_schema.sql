-- Kibay.com.do initial schema + RLS (run via: supabase db push / supabase migration up after link)
-- Requires pgcrypto for gen_random_uuid (available on Supabase by default)

-- ---------------------------------------------------------------------------
-- public.users (profile; id matches auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_own_or_public_authors
  ON public.users FOR SELECT TO anon, authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.blog_posts bp
      WHERE bp.author_id = users.id AND bp.published = true
    )
  );

CREATE POLICY users_update_own
  ON public.users FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY users_insert_own
  ON public.users FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- user_preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  newsletter_signup BOOLEAN DEFAULT false,
  preferences_json JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preferences_all_own
  ON public.user_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- blog_categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY blog_categories_read_all
  ON public.blog_categories FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY blog_categories_write_auth
  ON public.blog_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- blog_posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  content TEXT DEFAULT '',
  featured_image_url TEXT,
  published BOOLEAN DEFAULT false,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  slug TEXT UNIQUE,
  canonical_url TEXT,
  alt_text TEXT,
  author_email TEXT,
  author_id UUID REFERENCES public.users (id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.blog_categories (id) ON DELETE SET NULL,
  reading_time INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_posts_published_idx ON public.blog_posts (published, created_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON public.blog_posts (slug);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY blog_posts_select_public_or_auth
  ON public.blog_posts FOR SELECT TO anon, authenticated
  USING (published = true OR auth.uid() IS NOT NULL);

CREATE POLICY blog_posts_write_auth
  ON public.blog_posts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY blog_posts_update_auth
  ON public.blog_posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY blog_posts_delete_auth
  ON public.blog_posts FOR DELETE TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- blog_subscribers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  subscribed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blog_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY blog_subscribers_insert_anon
  ON public.blog_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY blog_subscribers_update_anon
  ON public.blog_subscribers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY blog_subscribers_select_auth
  ON public.blog_subscribers FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- newsletter_subscribers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  source TEXT,
  tags TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY newsletter_insert
  ON public.newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY newsletter_upsert
  ON public.newsletter_subscribers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY newsletter_select_auth
  ON public.newsletter_subscribers FOR SELECT TO authenticated USING (true);

-- ---------------------------------------------------------------------------
-- orders & order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Processing',
  total_amount INTEGER NOT NULL,
  items_count INTEGER DEFAULT 0,
  shipping_address JSONB,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  estimated_delivery_date TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id, created_at DESC);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_select_own
  ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY orders_insert_own
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY orders_update_own
  ON public.orders FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_per_item INTEGER NOT NULL,
  total_price INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS order_items_order_id_idx ON public.order_items (order_id);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_items_select_own
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  );

CREATE POLICY order_items_insert_own
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  );

CREATE POLICY order_items_update_own
  ON public.order_items FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  );

CREATE POLICY order_items_delete_own
  ON public.order_items FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- api_keys (rows managed in part by Edge Function manage-api-keys when deployed)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_prefix TEXT,
  key_hash TEXT,
  permissions TEXT[] DEFAULT ARRAY[]::text[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_auth_all
  ON public.api_keys FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- automation_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  function_name TEXT,
  action TEXT,
  status TEXT,
  error_message TEXT
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY automation_logs_auth
  ON public.automation_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- blog_social_posts (per-post social pipeline status)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts (id) ON DELETE CASCADE,
  instagram_status TEXT DEFAULT 'idle',
  tiktok_status TEXT DEFAULT 'idle',
  facebook_status TEXT DEFAULT 'idle',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (blog_post_id)
);

ALTER TABLE public.blog_social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY blog_social_posts_auth
  ON public.blog_social_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY blog_social_posts_select_public
  ON public.blog_social_posts FOR SELECT TO anon, authenticated USING (true);

-- ---------------------------------------------------------------------------
-- social_media_posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_post_id UUID REFERENCES public.blog_posts (id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_media_posts_auth
  ON public.social_media_posts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Sync auth.users -> public.users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Seed categories
INSERT INTO public.blog_categories (name, slug)
VALUES
  ('News', 'news'),
  ('Products', 'products'),
  ('Lifestyle', 'lifestyle')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage buckets (blog images)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog_images', 'blog_images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('blog_media', 'blog_media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY blog_images_public_read
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'blog_images');

CREATE POLICY blog_images_auth_upload
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog_images');

CREATE POLICY blog_images_auth_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog_images');

CREATE POLICY blog_images_auth_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog_images');

CREATE POLICY blog_media_public_read
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'blog_media');

CREATE POLICY blog_media_auth_upload
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog_media');

CREATE POLICY blog_media_auth_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'blog_media');

CREATE POLICY blog_media_auth_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'blog_media');
