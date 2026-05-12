-- Per-platform cross-post tracking. One row per (blog_post, platform).
-- Lets us see partial failures, retry just the broken platforms, audit history.

create table if not exists public.cross_post_jobs (
	id uuid primary key default gen_random_uuid(),
	blog_post_id uuid not null references public.blog_posts(id) on delete cascade,
	platform text not null,
	status text not null default 'pending',
	platform_post_id text,
	error_msg text,
	attempted_at timestamptz,
	created_at timestamptz not null default now(),
	unique (blog_post_id, platform)
);

create index if not exists idx_cross_post_jobs_blog
	on public.cross_post_jobs (blog_post_id);
create index if not exists idx_cross_post_jobs_status
	on public.cross_post_jobs (status);

alter table public.cross_post_jobs enable row level security;
drop policy if exists "cross_post_jobs service role" on public.cross_post_jobs;
create policy "cross_post_jobs service role"
	on public.cross_post_jobs
	for all
	using (auth.role() = 'service_role')
	with check (auth.role() = 'service_role');
