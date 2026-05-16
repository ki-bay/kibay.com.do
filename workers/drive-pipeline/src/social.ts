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
			const raw = await r.text();
			let j: {
				id?: string;
				post_id?: string;
				error?: { message: string; code?: number; error_subcode?: number; fbtrace_id?: string };
			} = {};
			try {
				j = JSON.parse(raw);
			} catch {
				console.error('fb /photos: non-JSON response', r.status, raw.slice(0, 300));
				return { platform: 'fb', status: 'failed', error_msg: `non-JSON ${r.status}: ${raw.slice(0, 120)}` };
			}
			if (j.error) {
				console.error('fb /photos failed', r.status, JSON.stringify(j.error));
				const e = j.error;
				const detail = `code=${e.code ?? '?'} sub=${e.error_subcode ?? '?'} trace=${e.fbtrace_id ?? '?'}`;
				return { platform: 'fb', status: 'failed', error_msg: `${e.message} [${detail}]` };
			}
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
			error_msg: 'LINKEDIN_ENABLED=false',
		};
	}
	if (!env.LINKEDIN_ACCESS_TOKEN || !env.LINKEDIN_AUTHOR_URN) {
		return { platform: 'li', status: 'skipped', error_msg: 'LinkedIn secrets missing' };
	}
	if (!opts.imageUrls.length) {
		return { platform: 'li', status: 'failed', error_msg: 'no images provided' };
	}
	const token = env.LINKEDIN_ACCESS_TOKEN;
	const author = env.LINKEDIN_AUTHOR_URN;
	const headers = {
		Authorization: `Bearer ${token}`,
		'X-Restli-Protocol-Version': '2.0.0',
		'Content-Type': 'application/json',
	};

	try {
		// 1. Register image upload — first image only for MVP (LinkedIn supports
		//    multi-image but each needs its own upload + the UGC structure differs).
		const regBody = {
			registerUploadRequest: {
				recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
				owner: author,
				serviceRelationships: [
					{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
				],
			},
		};
		const regR = await fetch(
			'https://api.linkedin.com/v2/assets?action=registerUpload',
			{ method: 'POST', headers, body: JSON.stringify(regBody) },
		);
		const regJ = (await regR.json()) as {
			value?: {
				uploadMechanism?: Record<string, { uploadUrl?: string }>;
				asset?: string;
			};
			message?: string;
		};
		if (!regJ.value?.asset) {
			return {
				platform: 'li',
				status: 'failed',
				error_msg: `registerUpload: ${regJ.message || JSON.stringify(regJ).slice(0, 200)}`,
			};
		}
		const assetUrn = regJ.value.asset;
		const uploadUrl =
			regJ.value.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
				?.uploadUrl;
		if (!uploadUrl) {
			return { platform: 'li', status: 'failed', error_msg: 'no uploadUrl returned' };
		}

		// 2. Fetch image bytes from our Supabase Storage URL, then PUT to LinkedIn upload URL.
		const imgR = await fetch(opts.imageUrls[0]);
		if (!imgR.ok) {
			return { platform: 'li', status: 'failed', error_msg: `image fetch failed: ${imgR.status}` };
		}
		const imgBytes = await imgR.arrayBuffer();
		const upR = await fetch(uploadUrl, {
			method: 'PUT',
			headers: { Authorization: `Bearer ${token}` },
			body: imgBytes,
		});
		if (!upR.ok) {
			return {
				platform: 'li',
				status: 'failed',
				error_msg: `upload PUT: ${upR.status} ${(await upR.text()).slice(0, 200)}`,
			};
		}

		// 3. Create the UGC post referencing the asset.
		const captionWithLink = `${opts.caption.trim()}\n\nRead more: ${opts.linkUrl}`;
		const postBody = {
			author,
			lifecycleState: 'PUBLISHED',
			specificContent: {
				'com.linkedin.ugc.ShareContent': {
					shareCommentary: { text: captionWithLink },
					shareMediaCategory: 'IMAGE',
					media: [
						{
							status: 'READY',
							media: assetUrn,
						},
					],
				},
			},
			visibility: {
				'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
			},
		};
		const ugcR = await fetch('https://api.linkedin.com/v2/ugcPosts', {
			method: 'POST',
			headers,
			body: JSON.stringify(postBody),
		});
		if (!ugcR.ok) {
			return {
				platform: 'li',
				status: 'failed',
				error_msg: `ugcPosts: ${ugcR.status} ${(await ugcR.text()).slice(0, 200)}`,
			};
		}
		const ugcJ = (await ugcR.json()) as { id?: string };
		// Also check the response header for the post id
		const postId = ugcJ.id || ugcR.headers.get('x-restli-id') || '';
		return { platform: 'li', status: 'posted', platform_post_id: postId };
	} catch (e: unknown) {
		return { platform: 'li', status: 'failed', error_msg: (e as Error)?.message || String(e) };
	}
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
