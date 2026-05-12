-- ============================================================================
-- Fix: public.users had no created_at column (the AdminCustomersPage query
-- ordered by it and broke). Also extend the auth -> public.users sync trigger
-- to auto-mirror new signups into email_contacts so they can be reached by
-- marketing campaigns without manual import. Existing rows backfilled.
-- ============================================================================

-- 1) Add created_at column to public.users -----------------------------------
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- Backfill from auth.users.created_at where available (matches the real
-- signup time rather than NOW()). For rows where the auth user is gone,
-- created_at stays at its default (NOW()).
UPDATE public.users pu
SET created_at = au.created_at
FROM auth.users au
WHERE pu.id = au.id;

CREATE INDEX IF NOT EXISTS users_created_at_idx ON public.users(created_at DESC);

-- 2) Replace handle_new_user trigger ----------------------------------------
-- Adds two things vs the original:
--   a) Populates created_at from auth.users.created_at
--   b) Also INSERTs into email_contacts (segment='individual', tagged
--      'customer'+'signup') so the customer is immediately reachable by
--      marketing campaigns. Existing email_contacts rows get the tags
--      merged (so manually-added contacts who later sign up keep their
--      original tags AND pick up the customer tag).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));

  -- Sync to public.users
  INSERT INTO public.users (id, email, full_name, created_at)
  VALUES (NEW.id, NEW.email, v_name, NEW.created_at)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();

  -- Auto-add to email marketing contacts. Suppressed (no-op) for emails
  -- already marked unsubscribed or bounced so re-signups don't re-enable
  -- a previously-suppressed contact.
  IF NEW.email IS NOT NULL THEN
    INSERT INTO public.email_contacts (email, first_name, segment, subtype_tags, source, status)
    VALUES (
      NEW.email,
      v_name,
      'individual',
      ARRAY['customer', 'signup'],
      'auth_signup',
      'active'
    )
    ON CONFLICT (email) DO UPDATE
      SET
        first_name = COALESCE(public.email_contacts.first_name, EXCLUDED.first_name),
        subtype_tags = ARRAY(
          SELECT DISTINCT unnest(public.email_contacts.subtype_tags || EXCLUDED.subtype_tags)
        )
      WHERE public.email_contacts.status = 'active';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger already exists; CREATE OR REPLACE FUNCTION above is enough.

-- 3) Backfill existing customers into email_contacts -------------------------
INSERT INTO public.email_contacts (email, first_name, segment, subtype_tags, source, status)
SELECT
  u.email,
  COALESCE(u.full_name, split_part(u.email, '@', 1)),
  'individual',
  ARRAY['customer', 'signup'],
  'auth_signup_backfill',
  'active'
FROM public.users u
WHERE u.email IS NOT NULL
ON CONFLICT (email) DO UPDATE
  SET subtype_tags = ARRAY(
    SELECT DISTINCT unnest(public.email_contacts.subtype_tags || EXCLUDED.subtype_tags)
  )
  WHERE public.email_contacts.status = 'active';
