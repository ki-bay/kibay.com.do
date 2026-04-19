function supabaseProjectUrl() {
	return (
		import.meta.env.VITE_SUPABASE_URL ||
		import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
		''
	).replace(/\/$/, '');
}

/**
 * Public URL for an object in a Supabase Storage bucket (path must not start with `/`).
 * @param {string} bucket - e.g. blog_media
 * @param {string} objectPath - e.g. invoices/uuid.pdf
 */
export function publicStorageObjectUrl(bucket, objectPath) {
	const base = supabaseProjectUrl();
	if (!base || !bucket || !objectPath) {
		return '';
	}
	const path = String(objectPath).replace(/^\//, '');
	return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
