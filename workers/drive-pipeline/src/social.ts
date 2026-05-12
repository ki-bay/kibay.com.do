// Cross-post to Meta (Facebook Page + Instagram Business) and LinkedIn.
// All platforms are feature-flagged; a 'skipped' result means the flag is off
// (typical for LinkedIn until MDP approves) or required secrets are missing.

export interface SocialEnv {
	META_ENABLED?: string;
	META_IG_ENABLED?: string;
	META_PAGE_ID?: string;
	META_PAGE_ACCESS_TOKEN?: string;
	META_IG_BUSINESS_ID?: string;
	LINKEDIN_ENABLED?: string;
	LINKEDIN_ACCESS_TOKEN?: string;
	LINKEDIN_AUTHOR_URN?: string;
}

export type Platform = 'fb' | 'ig' | 'li';

export interface SocialResult {
	platform: Platform;
	status: 'posted' | 'failed' | 'skipped';
	platform_post_id?: string;
	error_msg?: string;
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// After a publish attempt, check if a post actually appeared in the last 60s.
// Meta's API returns "transient error" on the publish call even when publish succeeds,
// so we cross-check the IG media feed to confirm. Returns the post id if found, else null.
async function verifyRecentPublish(
	igBusinessId: string,
	token: string,
	caption: string,
): Promise<string | null> {
	try {
		// Wait briefly for the post to land in feed
		await sleep(3000);
		const r = await fetch(
			`https://graph.facebook.com/v21.0/${igBusinessId}/media?fields=id,timestamp,caption&limit=5&access_token=${encodeURIComponent(
				token,
			)}`,
		);
		const j = (await r.json()) as {
			data?: Array<{ id: string; timestamp: string; caption?: string }>;
		};
		const items = j.data || [];
		const captionHead = caption.slice(0, 40).trim();
		const cutoff = Date.now() - 60 * 1000;
		for (const m of items) {
			const ts = Date.parse(m.timestamp);
			if (ts >= cutoff && (m.caption || '').startsWith(captionHead)) {
				return m.id;
			}
		}
		return null;
	} catch {
		return null;
	}
}

// Poll Meta's container status_code until terminal (FINISHED, ERROR, EXPIRED) or timeout.
async function pollContainerStatus(
	base: string,
	containerId: string,
	token: string,
	maxAttempts = 5,
	intervalMs = 2000,
): Promise<string> {
	for (let i = 0; i < maxAttempts; i++) {
		await sleep(intervalMs);
		const r = await fetch(
			`${base.replace(/\/[^\/]+$/, '')}/${containerId}?fields=status_code&access_token=${encodeURIComponent(
				token,
			)}`,
		);
		const j = (await r.json()) as { status_code?: string; error?: { message: string } };
		const s = j.status_code || 'UNKNOWN';
		if (s === 'FINISHED' || s === 'ERROR' || s === 'EXPIRED') return s;
	}
	return 'IN_PROGRESS';
}

export async function postToFacebook(
	env: SocialEnv,
	opts: { caption: string; imageUrls: string[]; linkUrl: string },
): Promise<SocialResult> {
	if (env.META_ENABLED !== 'true') {
		return { platform: 'fb', status: 'skipped', error_msg: 'META_ENABLED=false' };
	}
	if (!env.META_PAGE_ID || !env.META_PAGE_ACCESS_TOKEN) {
		return { platform: 'fb', status: 'skipped', error_msg: 'META secrets missing' };
	}
	if (!opts.imageUrls.length) {
		return { platform: 'fb', status: 'failed', error_msg: 'no images provided' };
	}
	try {
		const caption = `${opts.caption}\n\nRead more: ${opts.linkUrl}`;
		const pageId = env.META_PAGE_ID;
		const token = env.META_PAGE_ACCESS_TOKEN;

		// Single image → simple /photos endpoint with caption attached.
		if (opts.imageUrls.length === 1) {
			const r = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
				method: 'POST',
				body: new URLSearchParams({
					url: opts.imageUrls[0],
					caption,
					access_token: token,
				}),
			});
			const j = (await r.json()) as { id?: string; post_id?: string; error?: { message: string } };
			if (j.error) return { platform: 'fb', status: 'failed', error_msg: j.error.message };
			return { platform: 'fb', status: 'posted', platform_post_id: j.post_id || j.id };
		}

		// Multi-image → upload each photo unpublished, then create one feed post referencing them.
		const photoIds: string[] = [];
		for (const imageUrl of opts.imageUrls) {
			const r = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
				method: 'POST',
				body: new URLSearchParams({
					url: imageUrl,
					published: 'false',
					access_token: token,
				}),
			});
			const j = (await r.json()) as { id?: string; error?: { message: string } };
			if (j.error || !j.id) {
				return {
					platform: 'fb',
					status: 'failed',
					error_msg: `unpublished photo failed: ${j.error?.message || 'no id'}`,
				};
			}
			photoIds.push(j.id);
		}
		const attached = photoIds.map((id) => ({ media_fbid: id }));
		const feedR = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
			method: 'POST',
			body: new URLSearchParams({
				message: caption,
				attached_media: JSON.stringify(attached),
				access_token: token,
			}),
		});
		const feedJ = (await feedR.json()) as { id?: string; error?: { message: string } };
		if (feedJ.error) return { platform: 'fb', status: 'failed', error_msg: feedJ.error.message };
		return { platform: 'fb', status: 'posted', platform_post_id: feedJ.id };
	} catch (e: unknown) {
		return { platform: 'fb', status: 'failed', error_msg: (e as Error)?.message || String(e) };
	}
}

export async function postToInstagram(
	env: SocialEnv,
	opts: { caption: string; imageUrls: string[]; linkUrl?: string },
): Promise<SocialResult> {
	// Append the blog URL to the caption (IG doesn't render it as a hyperlink,
	// but readers can copy it and it's a brand signal pointing to the full post).
	const fullCaption = opts.linkUrl
		? `${opts.caption.trim()}\n\nRead more: ${opts.linkUrl}`
		: opts.caption;
	if (env.META_ENABLED !== 'true') {
		return { platform: 'ig', status: 'skipped', error_msg: 'META_ENABLED=false' };
	}
	if (env.META_IG_ENABLED !== 'true') {
		return {
			platform: 'ig',
			status: 'skipped',
			error_msg: 'META_IG_ENABLED=false (account not yet authorized for API publish; needs BM setup)',
		};
	}
	if (!env.META_IG_BUSINESS_ID || !env.META_PAGE_ACCESS_TOKEN) {
		return { platform: 'ig', status: 'skipped', error_msg: 'IG secrets missing' };
	}
	if (!opts.imageUrls.length) {
		return { platform: 'ig', status: 'failed', error_msg: 'no images provided' };
	}
	const igId = env.META_IG_BUSINESS_ID;
	const token = env.META_PAGE_ACCESS_TOKEN;
	const base = `https://graph.facebook.com/v21.0/${igId}`;

	try {
		// Single image → 2-step container/publish (unchanged).
		if (opts.imageUrls.length === 1) {
			const r1 = await fetch(`${base}/media`, {
				method: 'POST',
				body: new URLSearchParams({
					image_url: opts.imageUrls[0],
					caption: fullCaption,
					access_token: token,
				}),
			});
			const j1 = (await r1.json()) as { id?: string; error?: { message: string } };
			if (j1.error || !j1.id) {
				return {
					platform: 'ig',
					status: 'failed',
					error_msg: j1.error?.message || 'container creation returned no id',
				};
			}
			await sleep(3000);
			const r2 = await fetch(`${base}/media_publish`, {
				method: 'POST',
				body: new URLSearchParams({ creation_id: j1.id, access_token: token }),
			});
			const j2 = (await r2.json()) as {
				id?: string;
				error?: { message: string; code?: number; is_transient?: boolean };
			};
			if (j2.id) return { platform: 'ig', status: 'posted', platform_post_id: j2.id };
			// Same quirk for single-image: verify by recent-media check.
			const verified = await verifyRecentPublish(igId, token, opts.caption);
			if (verified) return { platform: 'ig', status: 'posted', platform_post_id: verified };
			return {
				platform: 'ig',
				status: 'failed',
				error_msg: j2.error?.message || 'unknown publish error',
			};
		}

		// Multi-image → carousel: child containers, poll each to FINISHED, carousel container,
		// poll to FINISHED, publish. Per Meta docs: container status_code must reach FINISHED
		// before referencing in a carousel or publishing — otherwise you get the generic
		// "An unexpected error has occurred. Please retry your request later."
		const childIds: string[] = [];
		for (const imageUrl of opts.imageUrls) {
			const r = await fetch(`${base}/media`, {
				method: 'POST',
				body: new URLSearchParams({
					image_url: imageUrl,
					is_carousel_item: 'true',
					access_token: token,
				}),
			});
			const j = (await r.json()) as { id?: string; error?: { message: string } };
			if (j.error || !j.id) {
				return {
					platform: 'ig',
					status: 'failed',
					error_msg: `carousel child failed: ${j.error?.message || 'no id'}`,
				};
			}
			childIds.push(j.id);
		}
		// Poll each child to FINISHED (max ~10s each)
		for (const cid of childIds) {
			const final = await pollContainerStatus(base, cid, token);
			if (final !== 'FINISHED') {
				return {
					platform: 'ig',
					status: 'failed',
					error_msg: `child ${cid} status=${final} (expected FINISHED) — likely an aspect-ratio mismatch or image format issue. Carousel needs all images same aspect ratio.`,
				};
			}
		}

		const carouselR = await fetch(`${base}/media`, {
			method: 'POST',
			body: new URLSearchParams({
				media_type: 'CAROUSEL',
				children: childIds.join(','),
				caption: fullCaption,
				access_token: token,
			}),
		});
		const carouselJ = (await carouselR.json()) as { id?: string; error?: { message: string } };
		if (carouselJ.error || !carouselJ.id) {
			return {
				platform: 'ig',
				status: 'failed',
				error_msg: `carousel container: ${carouselJ.error?.message || 'no id'}`,
			};
		}
		const carouselStatus = await pollContainerStatus(base, carouselJ.id, token);
		if (carouselStatus !== 'FINISHED') {
			return {
				platform: 'ig',
				status: 'failed',
				error_msg: `carousel status=${carouselStatus} (expected FINISHED)`,
			};
		}
		const publishR = await fetch(`${base}/media_publish`, {
			method: 'POST',
			body: new URLSearchParams({ creation_id: carouselJ.id, access_token: token }),
		});
		const publishJ = (await publishR.json()) as {
			id?: string;
			error?: { message: string; code?: number; is_transient?: boolean };
		};
		if (publishJ.id) {
			return { platform: 'ig', status: 'posted', platform_post_id: publishJ.id };
		}
		// Meta returns code=2 "transient" errors EVEN AFTER successful publish.
		// Cross-check by querying recent media — if a new post appeared in the last ~30s, the publish actually succeeded.
		const verified = await verifyRecentPublish(igId, token, opts.caption);
		if (verified) {
			return { platform: 'ig', status: 'posted', platform_post_id: verified };
		}
		return {
			platform: 'ig',
			status: 'failed',
			error_msg: publishJ.error?.message || 'unknown publish error',
		};
	} catch (e: unknown) {
		return { platform: 'ig', status: 'failed', error_msg: (e as Error)?.message || String(e) };
	}
}

export async function postToLinkedIn(
	env: SocialEnv,
	opts: { caption: string; linkUrl: string; imageUrls: string[] },
): Promise<SocialResult> {
	if (env.LINKEDIN_ENABLED !== 'true') {
		return {
			platform: 'li',
			status: 'skipped',
			error_msg: 'LINKEDIN_ENABLED=false (MDP pending)',
		};
	}
	if (!env.LINKEDIN_ACCESS_TOKEN || !env.LINKEDIN_AUTHOR_URN) {
		return { platform: 'li', status: 'skipped', error_msg: 'LinkedIn secrets missing' };
	}
	// Real implementation pending MDP approval. Skeleton:
	// 1. POST /v2/assets?action=registerUpload to register image
	// 2. PUT the binary to the returned upload URL
	// 3. POST /v2/ugcPosts with the asset URN
	void opts; // unused until enabled
	return { platform: 'li', status: 'failed', error_msg: 'LinkedIn not yet implemented' };
}

export async function crossPostAll(
	env: SocialEnv,
	post: {
		caption_fb: string;
		caption_ig: string;
		caption_li: string;
		imageUrls: string[];
		linkUrl: string;
	},
): Promise<SocialResult[]> {
	return Promise.all([
		postToFacebook(env, { caption: post.caption_fb, imageUrls: post.imageUrls, linkUrl: post.linkUrl }),
		postToInstagram(env, { caption: post.caption_ig, imageUrls: post.imageUrls, linkUrl: post.linkUrl }),
		postToLinkedIn(env, { caption: post.caption_li, imageUrls: post.imageUrls, linkUrl: post.linkUrl }),
	]);
}
