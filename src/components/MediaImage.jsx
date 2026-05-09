import React from 'react';
import { mediaUrlWebp } from '@/config/mediaCdn';

/**
 * Marketing image with a WebP source + JPG/PNG fallback. Pass the same `src`
 * you'd give an <img> (already resolved through mediaUrl()); a sibling .webp
 * variant is assumed at the same path.
 */
export default function MediaImage({ src, alt = '', ...rest }) {
	if (!src) return null;
	const webp = mediaUrlWebp(src);
	const hasWebpVariant = webp !== src;
	return (
		<picture>
			{hasWebpVariant && <source srcSet={webp} type="image/webp" />}
			<img src={src} alt={alt} {...rest} />
		</picture>
	);
}
