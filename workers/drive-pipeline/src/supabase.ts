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
