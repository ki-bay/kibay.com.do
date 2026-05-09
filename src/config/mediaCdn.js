// Marketing images are self-hosted under /public/media (with .webp variants).
// VITE_MEDIA_CDN_BASE remains an escape hatch for staging-style external CDNs.

export function getMediaCdnBase() {
	const explicit =
		import.meta.env.VITE_MEDIA_CDN_BASE || import.meta.env.NEXT_PUBLIC_MEDIA_CDN_BASE;
	if (explicit != null && String(explicit).trim() !== '') {
		return String(explicit).replace(/\/$/, '');
	}
	return '';
}

/** @param {string} filename - file name only, e.g. "logo.png" */
export function mediaUrl(filename) {
	const base = getMediaCdnBase();
	const path = filename.replace(/^\//, '');
	if (!base) {
		return `/media/${path}`;
	}
	return `${base}/${path}`;
}

/** WebP variant of a same-origin /media/ URL. Returns the input unchanged when no swap is possible. */
export function mediaUrlWebp(url) {
	if (!url || typeof url !== 'string') return url || '';
	return url.replace(/\.(jpe?g|png)(\?.*)?$/i, '.webp$2');
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
