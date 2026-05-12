-- Drive → Blog pipeline schema.
-- Adds a dedup table for processed Drive files and extends blog_posts with
-- pipeline metadata so manual + auto drafts can coexist.

create table if not exists public.processed_drive_files (
	file_id text primary key,
	drive_modified_time timestamptz,
	blog_post_id uuid references public.blog_posts(id) on delete set null,
	status text not null default 'draft_pending',
	processed_at timestamptz not null default now()
);

create index if not exists idx_processed_drive_files_status
	on public.processed_drive_files (status);

create index if not exists idx_processed_drive_files_blog_post_id
	on public.processed_drive_files (blog_post_id);

-- Extend blog_posts. All adds are idempotent so this migration can re-run safely.
alter table public.blog_posts add column if not exists source text not null default 'manual';
alter table public.blog_posts add column if not exists auto_draft_meta jsonb;
alter table public.blog_posts add column if not exists alt_text text;

create index if not exists idx_blog_posts_source on public.blog_posts (source);

-- RLS — service role bypasses; nothing else can touch processed_drive_files.
alter table public.processed_drive_files enable row level security;

drop policy if exists "processed_drive_files service role" on public.processed_drive_files;
create policy "processed_drive_files service role"
	on public.processed_drive_files
	for all
	using (auth.role() = 'service_role')
	with check (auth.role() = 'service_role');
