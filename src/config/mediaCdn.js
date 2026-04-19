/** Dev default for legacy Horizons marketing assets. Production: set VITE_MEDIA_CDN_BASE or use same-origin /public. */
const DEV_DEFAULT_BASE =
	'https://horizons-cdn.hostinger.com/786d721b-c0c7-4506-bee4-4ef9f4967a92';

export function getMediaCdnBase() {
	const explicit =
		import.meta.env.VITE_MEDIA_CDN_BASE || import.meta.env.NEXT_PUBLIC_MEDIA_CDN_BASE;
	if (explicit != null && String(explicit).trim() !== '') {
		return String(explicit).replace(/\/$/, '');
	}
	if (import.meta.env.PROD) {
		return '';
	}
	return DEV_DEFAULT_BASE.replace(/\/$/, '');
}

/** @param {string} filename - file name only, e.g. "logo.png" */
export function mediaUrl(filename) {
	const base = getMediaCdnBase();
	const path = filename.replace(/^\//, '');
	if (!base) {
		return `/${path}`;
	}
	return `${base}/${path}`;
}

/**
 * When VITE_MEDIA_CDN_BASE is set, remap Hostinger Horizons product image URLs to that host (path preserved).
 * @param {string | null | undefined} url
 * @returns {string}
 */
export function resolveProductMediaUrl(url) {
	if (!url || typeof url !== 'string') {
		return url || '';
	}
	const override =
		import.meta.env.VITE_MEDIA_CDN_BASE || import.meta.env.NEXT_PUBLIC_MEDIA_CDN_BASE;
	if (!override || String(override).trim() === '') {
		return url;
	}
	try {
		const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'https://kibay.com.do');
		if (u.hostname.includes('horizons-cdn.hostinger.com')) {
			const base = String(override).replace(/\/$/, '');
			return `${base}${u.pathname}${u.search}`;
		}
	} catch {
		/* keep url */
	}
	return url;
}
