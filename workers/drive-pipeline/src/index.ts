import { listImageGroups, downloadDriveFile, ImageGroup } from './drive';
import { generateBlogFromImage, ImageInput } from './anthropic';
import {
	isFileProcessed,
	uploadImage,
	insertBlogPost,
	recordProcessed,
	setPostPublished,
	deletePost,
	markProcessedStatus,
	getBlogPostForCrossPost,
	enqueueCrossPostJobs,
	updateCrossPostJob,
	SupabaseEnv,
} from './supabase';
import {
	sendReviewEmail,
	sendResultsEmail,
	verifyActionToken,
	actionResultPage,
	EmailEnv,
} from './email';
import { crossPostAll, SocialEnv } from './social';
import type { ServiceAccount } from './jwt';

interface Env extends SupabaseEnv, EmailEnv, SocialEnv {
	GOOGLE_SERVICE_ACCOUNT_JSON: string;
	GOOGLE_DRIVE_FOLDER_ID: string;
	ANTHROPIC_API_KEY: string;
	ANTHROPIC_MODEL: string;
	LINKEDIN_CLIENT_ID?: string;
	LINKEDIN_CLIENT_SECRET?: string;
}

export default {
	async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(runPipeline(env));
	},

	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(req.url);

		if (url.pathname === '/health') return new Response('ok');

		if (url.pathname === '/approve' && req.method === 'GET') {
			return handleAction(req, env, ctx, 'approve');
		}
		if (url.pathname === '/reject' && req.method === 'GET') {
			return handleAction(req, env, ctx, 'reject');
		}

		// LinkedIn OAuth helper — one-time use to mint a 60-day access token for
		// posting on behalf of the developer's personal profile. After running this
		// the user copies LINKEDIN_ACCESS_TOKEN + LINKEDIN_AUTHOR_URN into .env.local,
		// and we push them to Worker secrets. No protect token because LinkedIn
		// itself does the auth via the OAuth flow.
		if (url.pathname === '/auth/linkedin/start' && req.method === 'GET') {
			const clientId = env.LINKEDIN_CLIENT_ID || '';
			if (!clientId) return new Response('LINKEDIN_CLIENT_ID not set', { status: 500 });
			const redirectUri = `${env.WORKER_BASE_URL}/auth/linkedin/callback`;
			const state = crypto.randomUUID();
			const scope = 'openid profile email w_member_social';
			const auth = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${encodeURIComponent(
				clientId,
			)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
			return Response.redirect(auth, 302);
		}

		if (url.pathname === '/auth/linkedin/callback' && req.method === 'GET') {
			const code = url.searchParams.get('code');
			const err = url.searchParams.get('error');
			if (err) {
				return new Response(`OAuth error: ${err} — ${url.searchParams.get('error_description') || ''}`, {
					status: 400,
				});
			}
			if (!code) return new Response('missing code', { status: 400 });
			const clientId = env.LINKEDIN_CLIENT_ID || '';
			const clientSecret = env.LINKEDIN_CLIENT_SECRET || '';
			const redirectUri = `${env.WORKER_BASE_URL}/auth/linkedin/callback`;
			// Exchange code for access token
			const tokenR = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					grant_type: 'authorization_code',
					code,
					redirect_uri: redirectUri,
					client_id: clientId,
					client_secret: clientSecret,
				}),
			});
			const tokenJ = (await tokenR.json()) as {
				access_token?: string;
				expires_in?: number;
				scope?: string;
				error?: string;
				error_description?: string;
			};
			if (!tokenJ.access_token) {
				return new Response(
					`Token exchange failed: ${tokenJ.error} — ${tokenJ.error_description || ''}`,
					{ status: 400 },
				);
			}
			// Fetch the user URN via OpenID userinfo
			const userR = await fetch('https://api.linkedin.com/v2/userinfo', {
				headers: { Authorization: `Bearer ${tokenJ.access_token}` },
			});
			const userJ = (await userR.json()) as { sub?: string; name?: string; email?: string };
			if (!userJ.sub) {
				return new Response(`userinfo failed: ${JSON.stringify(userJ)}`, { status: 400 });
			}
			const authorUrn = `urn:li:person:${userJ.sub}`;
			const expiresDays = Math.round((tokenJ.expires_in || 0) / 86400);

			const html = `<!doctype html><html><head><meta charset="utf-8"><title>LinkedIn OAuth complete</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f4f0;margin:0;padding:40px;color:#1a1a1a;}
.card{max-width:680px;margin:0 auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);}
h1{margin:0 0 12px;color:#16a34a;}
.field{margin:20px 0;}
.field label{display:block;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#666;margin-bottom:6px;}
.field textarea{width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-family:Menlo,monospace;font-size:13px;background:#fafafa;}
.meta{font-size:13px;color:#666;margin-top:24px;padding-top:16px;border-top:1px solid #eee;}</style></head>
<body><div class="card">
<h1>✅ LinkedIn OAuth complete</h1>
<p>Copy these two values into <code>.env.local</code> (replacing any existing values), save, and tell Claude "linkedin done":</p>
<div class="field"><label>LINKEDIN_ACCESS_TOKEN</label>
<textarea rows="4" onclick="this.select()">${tokenJ.access_token}</textarea></div>
<div class="field"><label>LINKEDIN_AUTHOR_URN</label>
<textarea rows="1" onclick="this.select()">${authorUrn}</textarea></div>
<div class="meta">
<b>Authenticated as:</b> ${userJ.name || '(no name)'} &lt;${userJ.email || '(no email)'}&gt;<br>
<b>Token scope:</b> ${tokenJ.scope || '(none)'}<br>
<b>Token expires in:</b> ~${expiresDays} days (LinkedIn tokens last ~60 days; we'll set a calendar reminder).
</div>
</div></body></html>`;
			return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
		}

		// Resend the review email for an existing post (used when the pipeline ran out of
		// waitUntil budget mid-flow and managed to insert the post but never fired the email).
		// Same protect token as /run. ?post_id=<uuid> is required.
		if (url.pathname === '/resend-review' && req.method === 'POST') {
			const token = url.searchParams.get('token');
			if (token !== env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 24)) {
				return new Response('forbidden', { status: 403 });
			}
			const postId = url.searchParams.get('post_id');
			if (!postId) return new Response('post_id required', { status: 400 });

			const r = await fetch(
				`${env.SUPABASE_URL}/rest/v1/blog_posts?id=eq.${encodeURIComponent(postId)}&select=id,title,slug,content,featured_image_url,auto_draft_meta&limit=1`,
				{ headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } },
			);
			const rows = (await r.json()) as Array<{
				id: string;
				title: string;
				slug: string;
				content: string;
				featured_image_url: string;
				auto_draft_meta: {
					gallery_urls?: string[];
					drive_group_name?: string;
					en?: { title?: string; body_html?: string };
				} | null;
			}>;
			if (!rows.length) return new Response('post not found', { status: 404 });
			const post = rows[0];
			const meta = post.auto_draft_meta || {};
			// Spanish is primary (post.title, post.content); EN lives in meta.en
			const enBody = meta.en?.body_html || '';
			const enTitle = meta.en?.title || post.title;

			ctx.waitUntil(
				sendReviewEmail(env, {
					postId: post.id,
					titleEs: post.title,
					titleEn: enTitle,
					slug: post.slug,
					imageUrl: post.featured_image_url,
					galleryUrls: meta.gallery_urls,
					bodyExcerptEs: firstSentenceFromHtml(post.content),
					bodyExcerptEn: firstSentenceFromHtml(enBody),
					driveFilename: meta.drive_group_name || 'unknown',
				}).catch((e) => console.error('resend-review:', e)),
			);
			return new Response('queued', { status: 202 });
		}

		// Diagnostic: post a single image directly to IG and return raw Meta responses.
		// ?post_id=<uuid> → uses gallery[0] of that post. Same protect token as /run.
		if (url.pathname === '/debug-ig' && req.method === 'POST') {
			const token = url.searchParams.get('token');
			if (token !== env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 24)) {
				return new Response('forbidden', { status: 403 });
			}
			const postId = url.searchParams.get('post_id');
			if (!postId) return new Response('post_id required', { status: 400 });
			const customImage = url.searchParams.get('image_url');
			let imageUrl: string;
			if (customImage) {
				imageUrl = customImage;
			} else {
				const post = await getBlogPostForCrossPost(env, postId);
				if (!post) return new Response('post not found', { status: 404 });
				const meta = post.auto_draft_meta as { gallery_urls?: string[] } | null;
				const gallery = meta?.gallery_urls && meta.gallery_urls.length > 0 ? meta.gallery_urls : [post.featured_image_url];
				imageUrl = gallery[0];
			}
			const igId = env.META_IG_BUSINESS_ID || '';
			const pageTok = env.META_PAGE_ACCESS_TOKEN || '';
			const base = `https://graph.facebook.com/v21.0/${igId}`;

			// Step 1: create single-image container
			const r1 = await fetch(`${base}/media`, {
				method: 'POST',
				body: new URLSearchParams({
					image_url: imageUrl,
					caption: 'Kibay test post — please disregard',
					access_token: pageTok,
				}),
			});
			const j1 = await r1.json();
			const cid = (j1 as any)?.id;
			let pollResult: any = null;
			if (cid) {
				// Poll status only — do NOT publish. Container is auto-cleaned by Meta in ~24h.
				// (Past versions of /debug-ig published and accidentally created live IG posts
				// because Meta returns "transient error" even on successful publish.)
				for (let i = 0; i < 5; i++) {
					await new Promise((res) => setTimeout(res, 2000));
					const sr = await fetch(
						`https://graph.facebook.com/v21.0/${cid}?fields=status_code,status&access_token=${encodeURIComponent(pageTok)}`,
					);
					pollResult = await sr.json();
					const s = (pollResult as any)?.status_code;
					if (s === 'FINISHED' || s === 'ERROR' || s === 'EXPIRED') break;
				}
			}
			return new Response(
				JSON.stringify({
					mode: 'container-only (no publish)',
					image_url: imageUrl,
					ig_id: igId,
					container_create_response: j1,
					container_status_after_poll: pollResult,
				}, null, 2),
				{ headers: { 'content-type': 'application/json' } },
			);
		}

		// Retry IG for an existing blog post (FB succeeded but IG failed transiently).
		// Same protect token as /run. ?post_id=<uuid> is required.
		if (url.pathname === '/retry-ig' && req.method === 'POST') {
			const token = url.searchParams.get('token');
			if (token !== env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 24)) {
				return new Response('forbidden', { status: 403 });
			}
			const postId = url.searchParams.get('post_id');
			if (!postId) return new Response('post_id required', { status: 400 });
			ctx.waitUntil(retryInstagram(env, postId).catch((e) => console.error('retry-ig:', e)));
			return new Response('queued', { status: 202 });
		}

		// Diagnostics: probe the Meta Page state (IG linkage, etc.). Same protect token as /run.
		if (url.pathname === '/meta/status' && req.method === 'GET') {
			const token = url.searchParams.get('token');
			if (token !== env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 24)) {
				return new Response('forbidden', { status: 403 });
			}
			if (!env.META_PAGE_ID || !env.META_PAGE_ACCESS_TOKEN) {
				return new Response(JSON.stringify({ error: 'META_PAGE_ID or META_PAGE_ACCESS_TOKEN not set' }), {
					status: 500,
					headers: { 'content-type': 'application/json' },
				});
			}
			const r = await fetch(
				`https://graph.facebook.com/v21.0/${env.META_PAGE_ID}?fields=id,name,category,instagram_business_account{id,username},connected_instagram_account{id,username}&access_token=${env.META_PAGE_ACCESS_TOKEN}`,
			);
			return new Response(await r.text(), {
				status: r.status,
				headers: { 'content-type': 'application/json' },
			});
		}

		// Manual cron trigger, protected by a token derived from the service role key.
		if (url.pathname === '/run' && req.method === 'POST') {
			const token = url.searchParams.get('token');
			const expected = env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 24);
			if (token !== expected) return new Response('forbidden', { status: 403 });
			ctx.waitUntil(runPipeline(env));
			return new Response('queued', { status: 202 });
		}

		return new Response('not found', { status: 404 });
	},
};

async function runPipeline(env: Env): Promise<void> {
	let sa: ServiceAccount;
	try {
		sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
	} catch {
		console.error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON secret');
		return;
	}

	const groups = await listImageGroups(sa, env.GOOGLE_DRIVE_FOLDER_ID);
	console.log(`pipeline: scanning ${groups.length} groups (${groups.reduce((a, g) => a + g.images.length, 0)} images total)`);

	for (const g of groups) {
		try {
			if (await isFileProcessed(env, g.key)) continue;
			console.log(`pipeline: processing group ${g.name} (${g.key}, ${g.images.length} images)`);

			// Download + upload every image in the group.
			const uploaded: Array<{ url: string; mime: string; bytes: ArrayBuffer; driveId: string; name: string }> = [];
			for (const img of g.images) {
				const { bytes, contentType } = await downloadDriveFile(sa, img.id);
				const ext = (img.name.match(/\.([a-z0-9]+)$/i)?.[1] || 'jpg').toLowerCase();
				const path = `auto/${g.key}/${img.id}.${ext}`;
				const url = await uploadImage(env, path, bytes, contentType);
				uploaded.push({ url, mime: contentType, bytes, driveId: img.id, name: img.name });
			}

			const llmImages: ImageInput[] = uploaded.map((u) => ({ bytes: u.bytes, mimeType: u.mime }));
			const post = await generateBlogFromImage(
				env.ANTHROPIC_API_KEY,
				env.ANTHROPIC_MODEL,
				llmImages,
				g.name,
			);

			// Substitute {{IMAGE_N}} placeholders in body_html with <figure> blocks.
			const bodyEn = substitutePlaceholders(post.en.body_html, uploaded.map((u) => u.url), post.alt_text);
			const bodyEs = substitutePlaceholders(post.es.body_html, uploaded.map((u) => u.url), post.alt_text);

			const slug = makeUniqueSlug(post.slug, g.key);
			const heroUrl = uploaded[0].url;
			const galleryUrls = uploaded.map((u) => u.url);

			// Spanish is PRIMARY (site audience: DR + Latin America).
			const blogRow = {
				title: post.es.title,
				slug,
				description: post.es.seo_description,
				content: bodyEs,
				featured_image_url: heroUrl,
				alt_text: post.alt_text,
				seo_title: post.es.title,
				seo_description: post.es.seo_description,
				seo_keywords: post.tags.join(', '),
				reading_time: post.reading_time_min,
				published: false,
				source: 'drive_auto',
				auto_draft_meta: {
					drive_group_key: g.key,
					drive_group_name: g.name,
					drive_is_multi_image: g.isMultiImage,
					drive_modified_time: g.latestModified,
					gallery_urls: galleryUrls,
					es_extras: {
						faqs: post.es.faqs,
						data_callout: post.es.data_callout,
						pull_quote: post.es.pull_quote,
					},
					en: { ...post.en, body_html: bodyEn },
					social: {
						facebook: post.caption_facebook,
						instagram: post.caption_instagram,
						linkedin: post.caption_linkedin,
					},
					tags: post.tags,
					model: env.ANTHROPIC_MODEL,
				},
			};

			const inserted = await insertBlogPost(env, blogRow);
			await recordProcessed(env, {
				file_id: g.key,
				drive_modified_time: g.latestModified,
				blog_post_id: inserted.id,
				status: 'draft_pending',
			});

			await sendReviewEmail(env, {
				postId: inserted.id,
				titleEn: post.en.title,
				titleEs: post.es.title,
				slug,
				imageUrl: heroUrl,
				galleryUrls,
				bodyExcerptEn: firstSentenceFromHtml(bodyEn),
				bodyExcerptEs: firstSentenceFromHtml(bodyEs),
				driveFilename: g.name,
			});
		} catch (e) {
			console.error(`pipeline: failed for group ${g.key} (${g.name}):`, e);
			try {
				await recordProcessed(env, {
					file_id: g.key,
					drive_modified_time: g.latestModified,
					blog_post_id: null,
					status: 'failed',
				});
			} catch {
				/* swallow */
			}
		}
	}
}

function substitutePlaceholders(html: string, urls: string[], altBase: string): string {
	let out = html;
	for (let i = 0; i < urls.length; i++) {
		const token = `{{IMAGE_${i + 1}}}`;
		const figure = `<figure class="post-figure"><img src="${urls[i]}" alt="${escapeAttr(altBase)} — image ${i + 1}" loading="lazy" decoding="async" /></figure>`;
		// Replace all occurrences (Claude should put exactly one, but be defensive)
		out = out.split(token).join(figure);
	}
	// Strip any unsubstituted placeholders (Claude missed) so we never ship {{IMAGE_X}} to readers.
	out = out.replace(/\{\{IMAGE_\d+\}\}/g, '');
	return out;
}

function escapeAttr(s: string): string {
	return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

async function handleAction(
	req: Request,
	env: Env,
	ctx: ExecutionContext,
	action: 'approve' | 'reject',
): Promise<Response> {
	const url = new URL(req.url);
	const id = url.searchParams.get('id');
	const exp = url.searchParams.get('exp');
	const sig = url.searchParams.get('sig');
	if (!id || !exp || !sig) {
		return actionResultPage(action, false, 'Missing parameters.');
	}
	const v = await verifyActionToken(env, action, id, exp, sig);
	if (!v.ok) {
		const msg =
			v.reason === 'expired'
				? 'This approval link has expired. Open the latest review email or use the admin dashboard.'
				: 'This approval link is invalid or has been tampered with.';
		return actionResultPage(action, false, msg);
	}

	try {
		if (action === 'approve') {
			await setPostPublished(env, id, true);
			await markProcessedStatusByPostId(env, id, 'approved');
			// Fan out to social in the background — don't block the user's confirmation page.
			ctx.waitUntil(
				runCrossPost(env, id).catch((e) => console.error('cross-post fan-out:', e)),
			);
			return actionResultPage(
				'approve',
				true,
				"Published. Cross-posting to social in the background; you'll receive a results email shortly.",
			);
		}
		await deletePost(env, id);
		await markProcessedStatusByPostId(env, id, 'rejected');
		return actionResultPage(
			'reject',
			true,
			'The draft was discarded. This image will not be reprocessed.',
		);
	} catch (e) {
		console.error(`action ${action} failed:`, e);
		return actionResultPage(action, false, 'Internal error — try the admin dashboard.');
	}
}

async function runCrossPost(env: Env, blogPostId: string): Promise<void> {
	const post = await getBlogPostForCrossPost(env, blogPostId);
	if (!post) {
		console.error(`cross-post: blog_post ${blogPostId} not found`);
		return;
	}
	const meta = post.auto_draft_meta as
		| { social?: { facebook?: string; instagram?: string; linkedin?: string }; gallery_urls?: string[] }
		| null;
	const social = meta?.social || {};
	const gallery = meta?.gallery_urls && meta.gallery_urls.length > 0 ? meta.gallery_urls : [post.featured_image_url];
	const linkUrl = `${env.SITE_URL}/blog/${post.slug}`;
	const platforms = ['fb', 'ig', 'li'];

	await enqueueCrossPostJobs(env, blogPostId, platforms);

	const results = await crossPostAll(env, {
		caption_fb: social.facebook || post.title,
		caption_ig: social.instagram || post.title,
		caption_li: social.linkedin || post.title,
		imageUrls: gallery,
		linkUrl,
	});

	for (const r of results) {
		try {
			await updateCrossPostJob(env, blogPostId, r.platform, {
				status: r.status,
				platform_post_id: r.platform_post_id ?? null,
				error_msg: r.error_msg ?? null,
			});
		} catch (e) {
			console.error(`cross-post: job patch failed for ${r.platform}:`, e);
		}
	}

	try {
		await sendResultsEmail(env, { titleEn: post.title, slug: post.slug }, results);
	} catch (e) {
		console.error('cross-post: results email failed:', e);
	}
}

async function retryInstagram(env: Env, blogPostId: string): Promise<void> {
	const post = await getBlogPostForCrossPost(env, blogPostId);
	if (!post) {
		console.error(`retry-ig: blog_post ${blogPostId} not found`);
		return;
	}
	const meta = post.auto_draft_meta as
		| { social?: { facebook?: string; instagram?: string; linkedin?: string }; gallery_urls?: string[] }
		| null;
	const social = meta?.social || {};
	const gallery = meta?.gallery_urls && meta.gallery_urls.length > 0 ? meta.gallery_urls : [post.featured_image_url];

	// Lazy import-free: call postToInstagram via the social module already imported above.
	const { postToInstagram } = await import('./social');
	const r = await postToInstagram(env, {
		caption: social.instagram || post.title,
		imageUrls: gallery,
	});
	console.log(`retry-ig result: ${r.status} ${r.platform_post_id || r.error_msg || ''}`);
	try {
		await updateCrossPostJob(env, blogPostId, 'ig', {
			status: r.status,
			platform_post_id: r.platform_post_id ?? null,
			error_msg: r.error_msg ?? null,
		});
	} catch (e) {
		console.error('retry-ig: job patch failed:', e);
	}
}

async function markProcessedStatusByPostId(
	env: Env,
	postId: string,
	status: string,
): Promise<void> {
	const url = `${env.SUPABASE_URL}/rest/v1/processed_drive_files?blog_post_id=eq.${encodeURIComponent(
		postId,
	)}`;
	await fetch(url, {
		method: 'PATCH',
		headers: {
			apikey: env.SUPABASE_SERVICE_ROLE_KEY,
			Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ status }),
	});
}

function makeUniqueSlug(slug: string, fileId: string): string {
	const safe = slug
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 50);
	const suffix = fileId.replace(/[^a-z0-9]/gi, '').slice(0, 6).toLowerCase();
	return `${safe || 'post'}-${suffix}`;
}

function firstSentenceFromHtml(html: string): string {
	// Strip tags + collapse whitespace, take first ~280 chars or first sentence.
	const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
	const sentenceEnd = text.search(/[.!?](\s|$)/);
	const cut = sentenceEnd > 60 ? sentenceEnd + 1 : Math.min(text.length, 280);
	const out = text.slice(0, cut).trim();
	return out.length === text.length ? out : out + '…';
}
