export interface SupabaseEnv {
	SUPABASE_URL: string;
	SUPABASE_SERVICE_ROLE_KEY: string;
	SUPABASE_STORAGE_BUCKET: string;
}

function authHeaders(env: SupabaseEnv): Record<string, string> {
	return {
		apikey: env.SUPABASE_SERVICE_ROLE_KEY,
		Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
	};
}

export function publicUrl(env: SupabaseEnv, path: string): string {
	return `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/${encodeURI(
		path,
	)}`;
}

export async function uploadImage(
	env: SupabaseEnv,
	path: string,
	bytes: ArrayBuffer,
	contentType: string,
): Promise<string> {
	const url = `${env.SUPABASE_URL}/storage/v1/object/${env.SUPABASE_STORAGE_BUCKET}/${encodeURI(path)}`;
	const r = await fetch(url, {
		method: 'POST',
		headers: {
			...authHeaders(env),
			'Content-Type': contentType,
			'x-upsert': 'true',
		},
		body: bytes,
	});
	if (!r.ok) throw new Error(`Storage upload failed: ${r.status} ${await r.text()}`);
	return publicUrl(env, path);
}

export async function isFileProcessed(env: SupabaseEnv, fileId: string): Promise<boolean> {
	const url = `${env.SUPABASE_URL}/rest/v1/processed_drive_files?file_id=eq.${encodeURIComponent(
		fileId,
	)}&select=file_id&limit=1`;
	const r = await fetch(url, { headers: authHeaders(env) });
	if (!r.ok) throw new Error(`processed_drive_files check failed: ${r.status} ${await r.text()}`);
	const rows = (await r.json()) as unknown[];
	return rows.length > 0;
}

export async function insertBlogPost(
	env: SupabaseEnv,
	post: Record<string, unknown>,
): Promise<{ id: string }> {
	const url = `${env.SUPABASE_URL}/rest/v1/blog_posts`;
	const r = await fetch(url, {
		method: 'POST',
		headers: {
			...authHeaders(env),
			'Content-Type': 'application/json',
			Prefer: 'return=representation',
		},
		body: JSON.stringify(post),
	});
	if (!r.ok) throw new Error(`Blog insert failed: ${r.status} ${await r.text()}`);
	const rows = (await r.json()) as { id: string }[];
	return rows[0];
}

// Fire-and-forget call to the translate-blog-post Edge Function so the
// new post gets EN columns populated before it shows up on /blog for an
// English visitor. Awaits the request but tolerates failure — the post
// row stays at translation_status='pending' / 'failed' and can be
// retried from the admin Inbox or a backfill.
export async function triggerBlogTranslation(
	env: SupabaseEnv,
	postId: string,
): Promise<void> {
	const url = `${env.SUPABASE_URL}/functions/v1/translate-blog-post`;
	try {
		const r = await fetch(url, {
			method: 'POST',
			headers: {
				...authHeaders(env),
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ post_id: postId }),
		});
		if (!r.ok) {
			console.warn(
				`translate-blog-post returned ${r.status} for ${postId}: ${await r.text()}`,
			);
		}
	} catch (e) {
		console.warn(`translate-blog-post threw for ${postId}:`, e);
	}
}

// Fetch the N most recent published blog posts' (title, hero URL). Used by
// the visual-similarity guard before a new auto-generated post is created.
// Only PUBLISHED posts count — drafts (including ones we just skipped for
// similarity) aren't considered competition.
export async function recentPublishedHeroes(
	env: SupabaseEnv,
	withinDays: number,
	limit: number,
): Promise<Array<{ title: string; featured_image_url: string }>> {
	const since = new Date(Date.now() - withinDays * 24 * 60 * 60 * 1000).toISOString();
	const url =
		`${env.SUPABASE_URL}/rest/v1/blog_posts` +
		`?published=eq.true&published_at=gte.${encodeURIComponent(since)}` +
		`&featured_image_url=not.is.null` +
		`&select=title,featured_image_url&order=published_at.desc&limit=${limit}`;
	const r = await fetch(url, { headers: authHeaders(env) });
	if (!r.ok) {
		console.error(`recentPublishedHeroes failed: ${r.status}`);
		return [];
	}
	return (await r.json()) as Array<{ title: string; featured_image_url: string }>;
}

export async function recordProcessed(
	env: SupabaseEnv,
	row: {
		file_id: string;
		drive_modified_time: string;
		blog_post_id: string | null;
		status: string;
	},
): Promise<void> {
	const url = `${env.SUPABASE_URL}/rest/v1/processed_drive_files`;
	const r = await fetch(url, {
		method: 'POST',
		headers: {
			...authHeaders(env),
			'Content-Type': 'application/json',
			Prefer: 'resolution=merge-duplicates',
		},
		body: JSON.stringify(row),
	});
	if (!r.ok)
		throw new Error(`processed_drive_files insert failed: ${r.status} ${await r.text()}`);
}

export async function setPostPublished(
	env: SupabaseEnv,
	postId: string,
	published: boolean,
): Promise<void> {
	const url = `${env.SUPABASE_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(postId)}`;
	const r = await fetch(url, {
		method: 'PATCH',
		headers: {
			...authHeaders(env),
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ published }),
	});
	if (!r.ok) throw new Error(`Blog update failed: ${r.status} ${await r.text()}`);
}

export async function deletePost(env: SupabaseEnv, postId: string): Promise<void> {
	const url = `${env.SUPABASE_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(postId)}`;
	const r = await fetch(url, { method: 'DELETE', headers: authHeaders(env) });
	if (!r.ok) throw new Error(`Blog delete failed: ${r.status} ${await r.text()}`);
}

export async function markProcessedStatus(
	env: SupabaseEnv,
	fileId: string,
	status: string,
): Promise<void> {
	const url = `${env.SUPABASE_URL}/rest/v1/processed_drive_files?file_id=eq.${encodeURIComponent(
		fileId,
	)}`;
	const r = await fetch(url, {
		method: 'PATCH',
		headers: { ...authHeaders(env), 'Content-Type': 'application/json' },
		body: JSON.stringify({ status }),
	});
	if (!r.ok) throw new Error(`processed_drive_files patch failed: ${r.status} ${await r.text()}`);
}

export interface BlogPostForCrossPost {
	id: string;
	title: string;
	slug: string;
	featured_image_url: string;
	auto_draft_meta: {
		social?: { facebook?: string; instagram?: string; linkedin?: string };
		gallery_urls?: string[];
	} | null;
}

export async function getBlogPostForCrossPost(
	env: SupabaseEnv,
	id: string,
): Promise<BlogPostForCrossPost | null> {
	const url = `${env.SUPABASE_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(
		id,
	)}&select=id,title,slug,featured_image_url,auto_draft_meta&limit=1`;
	const r = await fetch(url, { headers: authHeaders(env) });
	if (!r.ok) return null;
	const rows = (await r.json()) as BlogPostForCrossPost[];
	return rows[0] ?? null;
}

export async function enqueueCrossPostJobs(
	env: SupabaseEnv,
	blogPostId: string,
	platforms: string[],
): Promise<void> {
	const url = `${env.SUPABASE_URL}/rest/v1/cross_post_jobs`;
	const rows = platforms.map((p) => ({
		blog_post_id: blogPostId,
		platform: p,
		status: 'pending',
	}));
	const r = await fetch(url, {
		method: 'POST',
		headers: {
			...authHeaders(env),
			'Content-Type': 'application/json',
			Prefer: 'resolution=merge-duplicates',
		},
		body: JSON.stringify(rows),
	});
	if (!r.ok) throw new Error(`cross_post_jobs insert failed: ${r.status} ${await r.text()}`);
}

export async function updateCrossPostJob(
	env: SupabaseEnv,
	blogPostId: string,
	platform: string,
	fields: { status: string; platform_post_id?: string | null; error_msg?: string | null },
): Promise<void> {
	const url = `${env.SUPABASE_URL}/rest/v1/cross_post_jobs?blog_post_id=eq.${encodeURIComponent(
		blogPostId,
	)}&platform=eq.${encodeURIComponent(platform)}`;
	const r = await fetch(url, {
		method: 'PATCH',
		headers: { ...authHeaders(env), 'Content-Type': 'application/json' },
		body: JSON.stringify({ ...fields, attempted_at: new Date().toISOString() }),
	});
	if (!r.ok) throw new Error(`cross_post_jobs patch failed: ${r.status} ${await r.text()}`);
}
