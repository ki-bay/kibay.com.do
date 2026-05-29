-- Blog posts: add EN columns alongside the existing ES-language fields so
-- the public blog can render in English without translating client-side.
-- The original columns (title, description, content, seo_*, alt_text) stay
-- the source-of-truth Spanish version. The *_en columns hold the Claude-
-- generated English translation, populated by the translate-blog-post Edge
-- Function either at publish time (admin save / Drive pipeline) or via the
-- one-shot backfill against existing rows.
--
-- translation_status lets us tell which posts still need an EN pass:
--   'pending'    — never translated (default for legacy rows)
--   'translated' — EN columns populated, in sync with current ES
--   'failed'     — last translation attempt errored; retry on next publish
--   'stale'      — ES was edited after the last EN translation; needs refresh

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS content_en text,
  ADD COLUMN IF NOT EXISTS seo_title_en text,
  ADD COLUMN IF NOT EXISTS seo_description_en text,
  ADD COLUMN IF NOT EXISTS seo_keywords_en text,
  ADD COLUMN IF NOT EXISTS alt_text_en text,
  ADD COLUMN IF NOT EXISTS translation_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS translation_updated_at timestamptz;

-- Anything already in the table is Spanish-only — mark it pending so the
-- backfill (and any future "needs translation" admin filter) sees them.
UPDATE public.blog_posts
SET translation_status = 'pending'
WHERE translation_status IS NULL;
