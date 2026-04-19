/** Base URL for static marketing images (no trailing slash). Override with VITE_MEDIA_CDN_BASE when you move assets. */
const DEFAULT_BASE =
	'https://horizons-cdn.hostinger.com/786d721b-c0c7-4506-bee4-4ef9f4967a92';

export function getMediaCdnBase() {
	const raw =
		import.meta.env.VITE_MEDIA_CDN_BASE ||
		import.meta.env.NEXT_PUBLIC_MEDIA_CDN_BASE ||
		DEFAULT_BASE;
	return String(raw).replace(/\/$/, '');
}

/** @param {string} filename - file name only, e.g. "logo.png" */
export function mediaUrl(filename) {
	const base = getMediaCdnBase();
	const path = filename.replace(/^\//, '');
	return `${base}/${path}`;
}
