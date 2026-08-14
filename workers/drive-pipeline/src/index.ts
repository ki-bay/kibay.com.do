import { listImageGroups, downloadDriveFile, ImageGroup } from './drive';
import { generateBlogFromImage, ImageInput, checkVisualSimilarity, RecentHero } from './anthropic';
import {
	isFileProcessed,
	uploadImage,
	insertBlogPost,
	triggerBlogTranslation,
	recordProcessed,
	recentPublishedHeroes,
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
	sendBrevoEmail,
	signUnsubscribeUrl,
	verifyUnsubscribeToken,
	unsubscribeResultPage,
	verifyCalendarToken,
	escapeHtml,
	EmailEnv,
} from './email';
import { crossPostAll, SocialEnv, SocialResult } from './social';
import type { ServiceAccount } from './jwt';

interface Env extends SupabaseEnv, EmailEnv, SocialEnv {
	GOOGLE_SERVICE_ACCOUNT_JSON: string;
	GOOGLE_DRIVE_FOLDER_ID: string;
	ANTHROPIC_API_KEY: string;
	ANTHROPIC_MODEL: string;
	LINKEDIN_CLIENT_ID?: string;
	LINKEDIN_CLIENT_SECRET?: string;
	// "true" → skip the review email and publish immediately on cron.
	AUTO_PUBLISH?: string;
	// Email marketing module (added 2026-05-12)
	BREVO_WEBHOOK_SECRET?: string;
	// Manual trigger auth for POST /campaigns/send-next (added 2026-08-12).
	DAILY_CAMPAIGN_CRON_TOKEN?: string;
	TRANSACTIONAL_RELAY_TOKEN?: string;
}

// CORS allowlist for endpoints called from the browser (admin SPA).
// /webhooks/brevo, /unsubscribe, and the diagnostic /run-style endpoints
// are not browser-called so they don't need CORS — only /email/send does.
const ALLOWED_ORIGINS = new Set([
	'https://kibay.com.do',
	'https://www.kibay.com.do',
	'http://localhost:5173',
	'http://localhost:4173',
]);

function corsHeaders(req: Request): Record<string, string> {
	const origin = req.headers.get('Origin') || '';
	if (!ALLOWED_ORIGINS.has(origin)) return {};
	return {
		'Access-Control-Allow-Origin': origin,
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Authorization, Content-Type',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin',
	};
}

function withCors(res: Response, req: Request): Response {
	const ch = corsHeaders(req);
	if (!Object.keys(ch).length) return res;
	const headers = new Headers(res.headers);
	for (const [k, v] of Object.entries(ch)) headers.set(k, v);
	return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default {
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		if (event.cron === DAILY_CAMPAIGN_CRON) {
			ctx.waitUntil(runDailyCampaignAutoSend(env));
			return;
		}
		ctx.waitUntil(runPipeline(env));
	},

	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(req.url);

		// CORS preflight for browser-called email endpoints.
		if (req.method === 'OPTIONS' && url.pathname.startsWith('/email/')) {
			return new Response(null, { status: 204, headers: corsHeaders(req) });
		}

		if (url.pathname === '/health') return new Response('ok');

		// GET /calendar/order/:id.ics?sig=<hmac>
		// Serves an .ics file containing one VEVENT per experience line item
		// in the order. The send-order-email function mints these URLs and
		// embeds them in the "Apple / Outlook (ICS)" button.
		{
			const m = url.pathname.match(/^\/calendar\/order\/([0-9a-f-]+)\.ics$/i);
			if (m && req.method === 'GET') {
				return handleCalendarIcs(env, m[1], url.searchParams.get('sig') || '');
			}
		}

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

		// =====================================================================
		// Email marketing module (added 2026-05-12)
		// Routes:
		//   POST /email/send           — admin sends campaign / test / inline
		//   GET  /unsubscribe          — recipient self-suppresses (HMAC-signed)
		//   POST /webhooks/brevo       — Brevo event tracking (delivered/open/etc)
		//   POST /newsletter/welcome   — fires a welcome email after public signup
		// =====================================================================

		if (url.pathname === '/newsletter/welcome' && req.method === 'POST') {
			try {
				const body = (await req.json()) as { email?: string; first_name?: string };
				const email = (body.email || '').trim().toLowerCase();
				if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
					return withCors(new Response(JSON.stringify({ ok: false, error: 'invalid email' }), {
						status: 400,
						headers: { 'content-type': 'application/json' },
					}), req);
				}
				// Verify the address is actually a subscriber before sending — prevents
				// abuse (random anon clients trying to spam arbitrary addresses with
				// "welcome to Kibay" mail). Service-role bypasses RLS for the check.
				const checkR = await fetch(
					`${env.SUPABASE_URL}/rest/v1/newsletter_subscribers?email=eq.${encodeURIComponent(email)}&select=email,first_name&limit=1`,
					{
						headers: {
							apikey: env.SUPABASE_SERVICE_ROLE_KEY,
							Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
						},
					},
				);
				const subs = (await checkR.json()) as Array<{ email: string; first_name?: string | null }>;
				if (!subs.length) {
					return withCors(new Response(JSON.stringify({ ok: false, error: 'not a subscriber' }), {
						status: 404,
						headers: { 'content-type': 'application/json' },
					}), req);
				}
				const firstName = body.first_name || subs[0].first_name || '';
				const unsubUrl = await signUnsubscribeUrl(env, email);
				const html = renderWelcomeEmail(firstName, unsubUrl);
				// 1. Customer welcome
				await sendBrevoEmail(env, {
					to: [{ email, name: firstName || undefined }],
					subject: 'Bienvenido/a a Kibay — gracias por suscribirte',
					htmlContent: html,
					replyTo: { email: 'info@kibay.com.do', name: 'Kibay' },
					tags: ['newsletter-welcome'],
				});
				// 2. Admin notification to REVIEW_EMAIL_TO (info@kibay.com.do). Best-
				//    effort: a failure here doesn't undo the customer-side success.
				try {
					const adminHtml = renderNewsletterAdminNotice(email, firstName);
					await sendBrevoEmail(env, {
						to: [{ email: env.REVIEW_EMAIL_TO, name: 'Kibay Admin' }],
						subject: `[Kibay] Nuevo suscriptor: ${email}`,
						htmlContent: adminHtml,
						tags: ['newsletter-admin-notify'],
					});
				} catch (adminErr) {
					console.error('admin notify failed (non-fatal):', adminErr);
				}
				return withCors(new Response(JSON.stringify({ ok: true }), {
					headers: { 'content-type': 'application/json' },
				}), req);
			} catch (e) {
				console.error('/newsletter/welcome error:', e);
				return withCors(new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
					status: 500,
					headers: { 'content-type': 'application/json' },
				}), req);
			}
		}

		if (url.pathname === '/email/send' && req.method === 'POST') {
			const auth = await verifyAdminAuth(env, req);
			if (!auth.ok) return withCors(new Response(auth.body, { status: auth.status }), req);
			try {
				return withCors(await handleEmailSend(env, req, auth.email), req);
			} catch (e) {
				console.error('/email/send error:', e);
				return withCors(
					new Response(
						JSON.stringify({ ok: false, error: (e as Error).message }),
						{ status: 500, headers: { 'content-type': 'application/json' } },
					),
					req,
				);
			}
		}

		// POST /transactional/send — relay for one-off transactional emails
		// (order confirmations, admin new-order notices) sent by Supabase Edge
		// Functions. Added 2026-08-14: Supabase Edge Functions run on Deno
		// Deploy's rotating pool of egress IPs, which Brevo's IP-allowlist
		// security silently rejects ("unrecognised IP address") — every
		// customer order confirmation + admin notification was failing
		// server-side with no visible error (the checkout-success page still
		// showed "confirmation sent" since that's just static copy, not a
		// delivery confirmation). Cloudflare Workers' egress is already
		// Brevo-trusted (same fix already used for the marketing pipeline), so
		// send-order-email now relays through here instead of calling Brevo
		// directly. Auth: SUPABASE_SERVICE_ROLE_KEY bearer only — no admin-user
		// JWT flow, this is server-to-server.
		if (url.pathname === '/transactional/send' && req.method === 'POST') {
			const auth = req.headers.get('authorization') || '';
			const token = auth.replace(/^Bearer\s+/i, '');
			// Dedicated token, not SUPABASE_SERVICE_ROLE_KEY — Supabase's
			// auto-injected value for that env var inside Edge Functions no
			// longer string-matches what this project's legacy service_role
			// key shows via the Management API (confirmed live 2026-08-14,
			// during the platform's sb_secret_* key migration), so relying on
			// it matching across two separate platforms (Supabase + Cloudflare)
			// was fragile. This token is minted and set on both sides directly.
			if (!token || token !== (env.TRANSACTIONAL_RELAY_TOKEN || '')) {
				return withCors(new Response('Unauthorized', { status: 401 }), req);
			}
			try {
				const body = (await req.json()) as {
					to?: string;
					toName?: string;
					subject?: string;
					htmlContent?: string;
					fromName?: string;
					fromEmail?: string;
					replyTo?: string;
				};
				if (!body.to || !body.subject || !body.htmlContent) {
					return withCors(
						new Response(JSON.stringify({ ok: false, error: 'to, subject, htmlContent required' }), {
							status: 400,
							headers: { 'content-type': 'application/json' },
						}),
						req,
					);
				}
				const result = await sendBrevoEmail(env, {
					to: [{ email: body.to, name: body.toName || undefined }],
					subject: body.subject,
					htmlContent: body.htmlContent,
					fromName: body.fromName,
					fromEmail: body.fromEmail,
					replyTo: body.replyTo ? { email: body.replyTo } : undefined,
					tags: ['transactional', 'order-email'],
				});
				return withCors(
					new Response(JSON.stringify({ ok: true, messageId: result.messageId }), {
						headers: { 'content-type': 'application/json' },
					}),
					req,
				);
			} catch (e) {
				console.error('/transactional/send error:', e);
				return withCors(
					new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
						status: 500,
						headers: { 'content-type': 'application/json' },
					}),
					req,
				);
			}
		}

		// POST /campaigns/send-next — manual trigger for the daily B2B rollout
		// (DAILY_CAMPAIGN_ORDER). No native Cloudflare cron trigger is wired up
		// for this yet — the account is at its free-plan 5-cron-trigger cap,
		// shared with an unrelated project (ocoabay-cron). Call this by hand
		// (or from any scheduler you control) once a day instead. Same auth as
		// the other cron-style endpoints: DAILY_CAMPAIGN_CRON_TOKEN or the
		// Supabase service-role key as a Bearer token.
		if (url.pathname === '/campaigns/send-next' && req.method === 'POST') {
			const auth = req.headers.get('authorization') || '';
			const token = auth.replace(/^Bearer\s+/i, '');
			const cronToken = env.DAILY_CAMPAIGN_CRON_TOKEN || '';
			if (token !== env.SUPABASE_SERVICE_ROLE_KEY && (!cronToken || token !== cronToken)) {
				return withCors(new Response('Unauthorized', { status: 401 }), req);
			}
			try {
				await runDailyCampaignAutoSend(env);
				return withCors(
					new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } }),
					req,
				);
			} catch (e) {
				console.error('/campaigns/send-next error:', e);
				return withCors(
					new Response(
						JSON.stringify({ ok: false, error: (e as Error).message }),
						{ status: 500, headers: { 'content-type': 'application/json' } },
					),
					req,
				);
			}
		}

		if (url.pathname === '/unsubscribe' && req.method === 'GET') {
			const email = url.searchParams.get('email') || '';
			const sig = url.searchParams.get('sig') || '';
			if (!email) return unsubscribeResultPage(false, '', 'Falta el correo electrónico');
			const ok = await verifyUnsubscribeToken(env, email, sig);
			if (!ok) return unsubscribeResultPage(false, email, 'Enlace inválido o alterado');
			try {
				await patchContactStatusByEmail(env, email, 'unsubscribed');
			} catch (e) {
				console.error('unsubscribe: contact patch failed:', e);
			}
			// Best-effort Brevo blocklist sync. Don't fail the page if Brevo errors.
			try {
				const r = await fetch('https://api.brevo.com/v3/contacts', {
					method: 'POST',
					headers: {
						'api-key': env.BREVO_API_KEY,
						'content-type': 'application/json',
						accept: 'application/json',
					},
					body: JSON.stringify({ email, emailBlacklisted: true, updateEnabled: true }),
				});
				if (!r.ok) {
					console.error(`unsubscribe: brevo blocklist failed: ${r.status} ${await r.text()}`);
				}
			} catch (e) {
				console.error('unsubscribe: brevo blocklist error:', e);
			}
			return unsubscribeResultPage(
				true,
				email,
				'No recibirás más correos de marketing de Kibay. Puedes volver a suscribirte cuando quieras respondiendo a cualquier correo.',
			);
		}

		if (url.pathname === '/webhooks/brevo' && req.method === 'POST') {
			if (!env.BREVO_WEBHOOK_SECRET) {
				return new Response('webhook not configured', { status: 500 });
			}
			const secret = url.searchParams.get('secret');
			if (secret !== env.BREVO_WEBHOOK_SECRET) {
				return new Response('unauthorized', { status: 401 });
			}
			let payload: unknown;
			try {
				payload = await req.json();
			} catch {
				return new Response('bad json', { status: 400 });
			}
			const events: BrevoEvent[] = Array.isArray(payload)
				? (payload as BrevoEvent[])
				: [payload as BrevoEvent];
			for (const ev of events) {
				try {
					await handleBrevoEvent(env, ev);
				} catch (e) {
					console.error('brevo webhook event handling failed:', e, ev);
				}
			}
			return new Response('OK', { status: 200 });
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

		// Retry BOTH Facebook and Instagram after a Meta token refresh.
		// Same protect-token convention as /retry-ig.
		if (url.pathname === '/retry-meta' && req.method === 'POST') {
			const token = url.searchParams.get('token');
			if (token !== env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 24)) {
				return new Response('forbidden', { status: 403 });
			}
			const postId = url.searchParams.get('post_id');
			if (!postId) return new Response('post_id required', { status: 400 });
			ctx.waitUntil(retryMeta(env, postId).catch((e) => console.error('retry-meta:', e)));
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

	// ONE blog post per cron run. We iterate the groups in Drive order, skip
	// anything already processed (incl. failed), and stop after the first
	// unprocessed group — success or failure. If today's pick errors out,
	// the next cron picks the next group; we never spam multiple drafts in
	// a single run.
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

			// VISUAL-DIVERSITY GUARD — skip if the new hero looks like a
			// recently-published post. File-ID dedup catches re-uploads of
			// the same Drive file; this catches different files from the
			// same photoshoot (which is what just shipped two near-identical
			// posts on 2026-05-22 and 2026-05-25). When similar, mark the
			// group processed-with-status=skipped_similar so the cron tries
			// the next group on its next run, and notify the admin via the
			// review-email channel that already exists.
			try {
				const recent = await recentPublishedHeroes(env, 30, 5);
				const recentBytes: RecentHero[] = [];
				for (const r of recent) {
					try {
						const fetched = await fetch(r.featured_image_url);
						if (!fetched.ok) continue;
						const bytes = await fetched.arrayBuffer();
						const mime = fetched.headers.get('content-type') || 'image/webp';
						recentBytes.push({ title: r.title, imageBytes: bytes, mimeType: mime });
					} catch {
						// Skip individual fetch failures rather than abort the whole check.
					}
				}
				const sim = await checkVisualSimilarity(
					env.ANTHROPIC_API_KEY,
					{ bytes: uploaded[0].bytes, mimeType: uploaded[0].mime },
					recentBytes,
				);
				if (sim.similar) {
					console.log(
						`pipeline: SKIPPING group ${g.name} — visually similar to "${sim.matchedTitle || 'recent post'}". Reason: ${sim.reason}`,
					);
					await recordProcessed(env, {
						file_id: g.key,
						drive_modified_time: g.latestModified,
						blog_post_id: null,
						status: 'skipped_similar',
					});
					return; // Stop after this group like a normal run; cron picks the next group next time.
				}
				console.log(`pipeline: similarity check passed — ${sim.reason || 'distinct enough'}`);
			} catch (simErr) {
				// The check is best-effort. If it throws, log + proceed to
				// generate the post anyway — better one redundant post than
				// no post.
				console.error('pipeline: similarity check threw, proceeding anyway:', simErr);
			}

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

			// Translate the post to English so /blog renders correctly for EN
			// visitors as soon as it ships. Awaited but tolerant — failure
			// leaves translation_status='failed' for later retry.
			await triggerBlogTranslation(env, inserted.id);

			// AUTO_PUBLISH=true → skip the human-in-the-loop email and ship
			// straight to the blog + social. A cross-post results email still
			// fires at the end of runCrossPost so the operator can see what
			// happened. The /approve and /reject routes stay live in case
			// AUTO_PUBLISH is flipped back to "false" later.
			if ((env.AUTO_PUBLISH || '').toLowerCase() === 'true') {
				await recordProcessed(env, {
					file_id: g.key,
					drive_modified_time: g.latestModified,
					blog_post_id: inserted.id,
					status: 'approved',
				});
				await setPostPublished(env, inserted.id, true);
				await runCrossPost(env, inserted.id);
				console.log(`pipeline: auto-published ${inserted.id} (slug=${slug})`);
			} else {
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
			}
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
		// One per run, success or failure. Stop after the first unprocessed
		// group is handled so a Drive folder with a backlog only drains at
		// the rate of one post per day.
		return;
	}
	console.log('pipeline: no unprocessed groups remaining in Drive folder — cron is a no-op');
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

// Retry both Facebook and Instagram for a post whose Meta tokens were stale
// at the time of the original cross-post run. LinkedIn is intentionally
// skipped (it goes through a separate token + usually succeeded already).
//
// Idempotency: a platform whose existing cross_post_jobs row is already
// `posted` is skipped so we don't create duplicate posts on a re-trigger.
async function retryMeta(env: Env, blogPostId: string): Promise<void> {
	const post = await getBlogPostForCrossPost(env, blogPostId);
	if (!post) {
		console.error(`retry-meta: blog_post ${blogPostId} not found`);
		return;
	}
	const meta = post.auto_draft_meta as
		| { social?: { facebook?: string; instagram?: string; linkedin?: string }; gallery_urls?: string[] }
		| null;
	const social = meta?.social || {};
	const gallery = meta?.gallery_urls && meta.gallery_urls.length > 0 ? meta.gallery_urls : [post.featured_image_url];
	const linkUrl = `https://kibay.com.do/blog/${post.slug}`;

	// Read existing job statuses so we only retry the failed/missing platforms.
	const jobsUrl = `${env.SUPABASE_URL}/rest/v1/cross_post_jobs?blog_post_id=eq.${encodeURIComponent(
		blogPostId,
	)}&select=platform,status`;
	const jobsR = await fetch(jobsUrl, {
		headers: {
			apikey: env.SUPABASE_SERVICE_ROLE_KEY,
			Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
		},
	});
	const jobs = (await jobsR.json()) as Array<{ platform: string; status: string }>;
	const fbPosted = jobs.some((j) => j.platform === 'fb' && j.status === 'posted');
	const igPosted = jobs.some((j) => j.platform === 'ig' && j.status === 'posted');

	if (fbPosted && igPosted) {
		console.log('retry-meta: both fb+ig already posted, nothing to do');
		return;
	}

	const { postToFacebook, postToInstagram } = await import('./social');
	const tasks: Array<Promise<{ platform: 'fb' | 'ig'; result: SocialResult }>> = [];
	if (!fbPosted) {
		tasks.push(
			postToFacebook(env, { caption: social.facebook || post.title, imageUrls: gallery, linkUrl }).then((r) => ({
				platform: 'fb' as const,
				result: r,
			})),
		);
	} else {
		console.log('retry-meta: fb already posted, skipping');
	}
	if (!igPosted) {
		tasks.push(
			postToInstagram(env, { caption: social.instagram || post.title, imageUrls: gallery, linkUrl }).then((r) => ({
				platform: 'ig' as const,
				result: r,
			})),
		);
	} else {
		console.log('retry-meta: ig already posted, skipping');
	}

	const results = await Promise.all(tasks);
	for (const { platform, result } of results) {
		console.log(`retry-meta ${platform}: ${result.status} ${result.platform_post_id || result.error_msg || ''}`);
		try {
			await updateCrossPostJob(env, blogPostId, platform, {
				status: result.status,
				platform_post_id: result.platform_post_id ?? null,
				error_msg: result.error_msg ?? null,
			});
		} catch (e) {
			console.error(`retry-meta: ${platform} job patch failed:`, e);
		}
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

// =============================================================================
// Email marketing helpers (added 2026-05-12)
// =============================================================================

interface AdminAuthOk {
	ok: true;
	email: string;
}
interface AdminAuthErr {
	ok: false;
	status: number;
	body: string;
}

async function verifyAdminAuth(env: Env, req: Request): Promise<AdminAuthOk | AdminAuthErr> {
	const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
	if (!authHeader.toLowerCase().startsWith('bearer ')) {
		return { ok: false, status: 401, body: 'missing auth' };
	}
	const userR = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
		headers: {
			apikey: env.SUPABASE_SERVICE_ROLE_KEY,
			Authorization: authHeader,
		},
	});
	if (!userR.ok) {
		return { ok: false, status: 401, body: await userR.text() };
	}
	const userJ = (await userR.json()) as { email?: string };
	if (!userJ.email || userJ.email.toLowerCase() !== env.REVIEW_EMAIL_TO.toLowerCase()) {
		return { ok: false, status: 403, body: 'forbidden' };
	}
	return { ok: true, email: userJ.email };
}

interface SegmentFilter {
	segments?: string[];
	tags?: string[];
	status?: string;
}

interface InlineSendInput {
	name?: string;
	subject: string;
	htmlContent: string;
	fromName?: string;
	fromEmail?: string;
	replyTo?: string;
	segmentFilter?: SegmentFilter;
	attachment?: Array<{ name: string; content: string }>; // content = base64
}

interface EmailSendBody {
	campaignId?: string;
	inline?: InlineSendInput;
	testTo?: string;
	recipientEmails?: string[];
	transactional?: boolean;
}

interface CampaignRow {
	id: string;
	name: string;
	subject: string;
	html_content: string;
	from_name: string | null;
	from_email: string | null;
	reply_to: string | null;
	segment_filter: SegmentFilter | null;
	status: string;
}

interface ContactRow {
	id: string;
	email: string;
	first_name: string | null;
	last_name: string | null;
	segment: string;
	subtype_tags: string[] | null;
	merge_vars: Record<string, string | number | boolean> | null;
	status: string;
}

// Daily B2B campaign rollout — one campaign per day, in priority order
// (largest/most-ready segments first). Each entry is sent once; the cron
// picks the first name below still in `draft`/`sending` status and sends up
// to DAILY_CAMPAIGN_BATCH_SIZE of its remaining recipients per run (see
// runDailyCampaignAutoSend for why — Cloudflare's free-tier subrequest cap
// per invocation caused partial failures sending Fine Dining in one shot).
//
// Not on a native cron trigger currently — the account is at its free-plan
// 5-trigger cap (shared with the unrelated ocoabay-cron project). Run via
// POST /campaigns/send-next instead. DAILY_CAMPAIGN_CRON is kept so wiring
// up a real schedule later (once a slot frees up or the account upgrades)
// is a one-line wrangler.toml change, no code change.
const DAILY_CAMPAIGN_CRON = '0 14 * * *';
const DAILY_CAMPAIGN_BATCH_SIZE = 15;
const DAILY_CAMPAIGN_ORDER = [
	'B2B Hospitalidad — Caja de muestras',
	'B2B Hoteles — Wine experience local',
	'B2B Supermercados — Rotación + góndola dominicana',
	'B2B Retail — Distribuidores / minoristas',
	'B2B Importadores — Distribución exclusiva',
	'B2B Wine Shops — Rareza con historia',
	'B2B Eventos y catering — Volumen + entrega',
	'Individual — Tienda online + oferta de bienvenida',
	'B2B Online retailers — Comisión + activos listos',
	'B2B Duty-Free — Travel retail premium',
	'Individual — Experiencia en la bodega Ocoa Bay',
];

// 'draft' = not started yet; 'sending' = a previous day's run got partway
// through a large campaign and left it in progress — resume it rather than
// re-picking from the top (which would re-send to people already logged).
async function loadResumableCampaignByName(env: Env, name: string): Promise<CampaignRow | null> {
	const u = `${env.SUPABASE_URL}/rest/v1/email_campaigns?name=eq.${encodeURIComponent(
		name,
	)}&status=in.(draft,sending)&select=id,name,subject,html_content,from_name,from_email,reply_to,segment_filter,status&limit=1`;
	const r = await fetch(u, { headers: emailMarketingHeaders(env) });
	if (!r.ok) return null;
	const rows = (await r.json()) as CampaignRow[];
	return rows[0] ?? null;
}

// "Already contacted" = any log row exists for this campaign+recipient, not
// status='sent' specifically — the Brevo webhook (handleBrevoEvent) rewrites
// that same status column to delivered/bounced/opened/etc within seconds of
// the send, so filtering on 'sent' alone undercounts almost immediately and
// would cause the resume logic to re-email people who were already contacted
// (including retrying already-bounced addresses).
async function loadSentEmailsForCampaign(env: Env, campaignId: string): Promise<Set<string>> {
	const u = `${env.SUPABASE_URL}/rest/v1/email_logs?campaign_id=eq.${encodeURIComponent(
		campaignId,
	)}&select=recipient`;
	const r = await fetch(u, { headers: emailMarketingHeaders(env) });
	if (!r.ok) return new Set();
	const rows = (await r.json()) as Array<{ recipient: string }>;
	return new Set(rows.map((row) => row.recipient.toLowerCase()));
}

// Runs on the daily cron. Each invocation sends up to DAILY_CAMPAIGN_BATCH_SIZE
// recipients of the current campaign in DAILY_CAMPAIGN_ORDER — a real
// Cloudflare-imposed ceiling per invocation (see the "Too many subrequests"
// failure hit while manually sending Fine Dining to 48 people in one shot;
// chunking the loop *inside* one invocation doesn't help, since the
// subrequest budget is shared across the whole invocation regardless of how
// the work is grouped in code — only separate invocations get a fresh one).
// Large campaigns (e.g. Hospitalidad's 77) span multiple days automatically:
// already-sent recipients are excluded via email_logs, so each day picks up
// where the last one left off, and the campaign only moves to 'sent' (and
// the rollout advances to the next name) once every recipient is accounted
// for — self-healing the same way the manual Fine Dining recovery worked.
async function runDailyCampaignAutoSend(env: Env): Promise<void> {
	let campaign: CampaignRow | null = null;
	for (const name of DAILY_CAMPAIGN_ORDER) {
		campaign = await loadResumableCampaignByName(env, name);
		if (campaign) break;
	}
	if (!campaign) {
		console.log('runDailyCampaignAutoSend: no draft/sending campaigns left in the rollout order — nothing to do');
		return;
	}

	const allRecipients = await loadContactsBySegment(env, campaign.segment_filter || {});
	const alreadySent = await loadSentEmailsForCampaign(env, campaign.id);
	const remaining = allRecipients.filter((c) => !alreadySent.has(c.email.toLowerCase()));
	const todaysBatch = remaining.slice(0, DAILY_CAMPAIGN_BATCH_SIZE);

	console.log(
		`runDailyCampaignAutoSend: "${campaign.name}" — ${alreadySent.size} already sent, ` +
			`${remaining.length} remaining, sending ${todaysBatch.length} today`,
	);

	if (campaign.status !== 'sending') {
		try {
			await patchCampaign(env, campaign.id, { status: 'sending' });
		} catch (e) {
			console.error('runDailyCampaignAutoSend: status->sending failed:', e);
		}
	}

	let sentCount = 0;
	let failedCount = 0;
	for (const c of todaysBatch) {
		try {
			const finalHtml = await injectUnsubscribeFooter(env, campaign.html_content, c.email);
			const params = c.merge_vars && Object.keys(c.merge_vars).length > 0 ? c.merge_vars : undefined;
			const recipientName = [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || undefined;
			const result = await sendBrevoEmail(env, {
				to: [{ email: c.email, name: recipientName, params }],
				subject: campaign.subject,
				htmlContent: finalHtml,
				fromName: campaign.from_name || undefined,
				fromEmail: campaign.from_email || undefined,
				replyTo: campaign.reply_to ? { email: campaign.reply_to } : undefined,
				tags: [`campaign:${campaign.id}`, `segment:${c.segment}`, 'daily-auto'],
			});
			await insertEmailLog(env, {
				campaign_id: campaign.id,
				recipient: c.email,
				contact_id: c.id || null,
				message_id: result.messageId || null,
				campaign_type: c.segment,
				status: 'sent',
				sent_at: new Date().toISOString(),
			});
			sentCount++;
		} catch (e) {
			failedCount++;
			const msg = (e as Error).message || String(e);
			console.error(`runDailyCampaignAutoSend: failed for ${c.email}:`, msg);
			try {
				await insertEmailLog(env, {
					campaign_id: campaign.id,
					recipient: c.email,
					contact_id: c.id || null,
					message_id: null,
					campaign_type: c.segment,
					status: 'failed',
					bounce_reason: msg,
				});
			} catch (logErr) {
				console.error('runDailyCampaignAutoSend: failed-log insert failed:', logErr);
			}
		}
	}

	const stillRemaining = remaining.length - todaysBatch.length;
	if (stillRemaining > 0) {
		console.log(
			`runDailyCampaignAutoSend: "${campaign.name}" not finished — ${stillRemaining} left, resuming tomorrow`,
		);
		return;
	}

	try {
		const totalSentEver = alreadySent.size + sentCount;
		await patchCampaign(env, campaign.id, {
			status: totalSentEver === 0 && allRecipients.length > 0 ? 'failed' : 'sent',
			sent_at: new Date().toISOString(),
			recipients_count: totalSentEver,
			sent_by: 'daily-cron',
		});
	} catch (e) {
		console.error('runDailyCampaignAutoSend: finalize failed:', e);
	}

	console.log(`runDailyCampaignAutoSend: "${campaign.name}" complete — sent today=${sentCount} failed today=${failedCount}`);
}

async function handleEmailSend(env: Env, req: Request, adminEmail: string): Promise<Response> {
	let body: EmailSendBody;
	try {
		body = (await req.json()) as EmailSendBody;
	} catch {
		return new Response(
			JSON.stringify({ ok: false, error: 'bad json' }),
			{ status: 400, headers: { 'content-type': 'application/json' } },
		);
	}

	if (body.campaignId && body.inline) {
		return new Response(
			JSON.stringify({ ok: false, error: 'campaignId and inline are mutually exclusive' }),
			{ status: 400, headers: { 'content-type': 'application/json' } },
		);
	}
	if (!body.campaignId && !body.inline) {
		return new Response(
			JSON.stringify({ ok: false, error: 'campaignId or inline required' }),
			{ status: 400, headers: { 'content-type': 'application/json' } },
		);
	}

	// Resolve campaign row + send parameters.
	let campaign: CampaignRow | null = null;
	let subject: string;
	let htmlContent: string;
	let fromName: string | undefined;
	let fromEmail: string | undefined;
	let replyToEmail: string | undefined;
	let segmentFilter: SegmentFilter;

	if (body.campaignId) {
		campaign = await loadCampaign(env, body.campaignId);
		if (!campaign) {
			return new Response(
				JSON.stringify({ ok: false, error: 'campaign not found' }),
				{ status: 404, headers: { 'content-type': 'application/json' } },
			);
		}
		if (campaign.status === 'sent' && !body.testTo) {
			return new Response(
				JSON.stringify({ ok: false, error: 'already sent' }),
				{ status: 400, headers: { 'content-type': 'application/json' } },
			);
		}
		subject = campaign.subject;
		htmlContent = campaign.html_content;
		fromName = campaign.from_name || undefined;
		fromEmail = campaign.from_email || undefined;
		replyToEmail = campaign.reply_to || undefined;
		segmentFilter = campaign.segment_filter || {};
	} else {
		const inline = body.inline as InlineSendInput;
		if (!inline.subject || !inline.htmlContent) {
			return new Response(
				JSON.stringify({ ok: false, error: 'inline.subject and inline.htmlContent required' }),
				{ status: 400, headers: { 'content-type': 'application/json' } },
			);
		}
		subject = inline.subject;
		htmlContent = inline.htmlContent;
		fromName = inline.fromName;
		fromEmail = inline.fromEmail;
		replyToEmail = inline.replyTo;
		segmentFilter = inline.segmentFilter || {};
	}

	// ---- Test mode: send to one address, no logs, no campaign mutation ------
	if (body.testTo) {
		const testEmail = body.testTo;
		// body.transactional=true (only valid with inline, not a saved campaign):
		// a genuine one-off email (e.g. to a vendor/partner) — no "[TEST]" prefix,
		// no marketing-unsubscribe footer, but still supports attachments.
		const isTransactional = !campaign && body.transactional === true;
		const finalHtml = isTransactional ? htmlContent : await injectUnsubscribeFooter(env, htmlContent, testEmail);
		const result = await sendBrevoEmail(env, {
			to: [{ email: testEmail }],
			subject: isTransactional ? subject : `[TEST] ${subject}`,
			htmlContent: finalHtml,
			fromName,
			fromEmail,
			replyTo: replyToEmail ? { email: replyToEmail } : undefined,
			tags: campaign ? [`campaign:${campaign.id}`, 'test'] : isTransactional ? ['inline', 'transactional'] : ['inline', 'test'],
			attachment: (body.inline as InlineSendInput | undefined)?.attachment,
		});
		return new Response(
			JSON.stringify({
				ok: true,
				mode: 'test',
				sentTo: testEmail,
				messageId: result.messageId,
			}),
			{ headers: { 'content-type': 'application/json' } },
		);
	}

	// ---- Resolve recipients (campaign + inline modes) -----------------------
	let recipients: ContactRow[];
	if (body.recipientEmails && body.recipientEmails.length > 0) {
		recipients = await loadContactsByEmails(env, body.recipientEmails);
		// Synthesize stub rows for any addresses that aren't in the contacts table
		// so the explicit override still sends.
		const seen = new Set(recipients.map((r) => r.email.toLowerCase()));
		for (const e of body.recipientEmails) {
			if (!seen.has(e.toLowerCase())) {
				recipients.push({
					id: '',
					email: e,
					first_name: null,
					last_name: null,
					segment: 'individual',
					subtype_tags: [],
					merge_vars: {},
					status: 'active',
				});
			}
		}
		// Filter out unsubscribed/bounced ones we did find.
		recipients = recipients.filter(
			(r) => r.status !== 'unsubscribed' && r.status !== 'bounced',
		);
	} else {
		recipients = await loadContactsBySegment(env, segmentFilter);
	}

	// ---- Campaign mode: mark sending before the loop ------------------------
	if (campaign) {
		try {
			await patchCampaign(env, campaign.id, { status: 'sending' });
		} catch (e) {
			console.error('campaign status->sending failed:', e);
		}
	}

	// ---- Send loop (one Brevo request per recipient for clean correlation) --
	let sentCount = 0;
	let failedCount = 0;
	const errors: Array<{ email: string; error: string }> = [];

	for (const c of recipients) {
		try {
			const finalHtml = await injectUnsubscribeFooter(env, htmlContent, c.email);
			const params = c.merge_vars && Object.keys(c.merge_vars).length > 0 ? c.merge_vars : undefined;
			const recipientName =
				[c.first_name, c.last_name].filter(Boolean).join(' ').trim() || undefined;
			const result = await sendBrevoEmail(env, {
				to: [{ email: c.email, name: recipientName, params }],
				subject,
				htmlContent: finalHtml,
				fromName,
				fromEmail,
				replyTo: replyToEmail ? { email: replyToEmail } : undefined,
				tags: campaign
					? [`campaign:${campaign.id}`, `segment:${c.segment}`]
					: ['inline', `segment:${c.segment}`],
			});
			await insertEmailLog(env, {
				campaign_id: campaign ? campaign.id : null,
				recipient: c.email,
				contact_id: c.id || null,
				message_id: result.messageId || null,
				campaign_type: c.segment,
				status: 'sent',
				sent_at: new Date().toISOString(),
			});
			sentCount++;
		} catch (e) {
			failedCount++;
			const msg = (e as Error).message || String(e);
			errors.push({ email: c.email, error: msg });
			try {
				await insertEmailLog(env, {
					campaign_id: campaign ? campaign.id : null,
					recipient: c.email,
					contact_id: c.id || null,
					message_id: null,
					campaign_type: c.segment,
					status: 'failed',
					bounce_reason: msg,
				});
			} catch (logErr) {
				console.error('failed-log insert failed:', logErr);
			}
		}
	}

	// ---- Campaign mode: finalize row ----------------------------------------
	if (campaign) {
		try {
			await patchCampaign(env, campaign.id, {
				status: failedCount === recipients.length && recipients.length > 0 ? 'failed' : 'sent',
				sent_at: new Date().toISOString(),
				recipients_count: sentCount,
				sent_by: adminEmail,
			});
		} catch (e) {
			console.error('campaign finalize failed:', e);
		}
	}

	return new Response(
		JSON.stringify({
			ok: true,
			mode: campaign ? 'campaign' : 'inline',
			campaignId: campaign ? campaign.id : null,
			sentCount,
			failedCount,
			errors,
		}),
		{ headers: { 'content-type': 'application/json' } },
	);
}

async function injectUnsubscribeFooter(
	env: Env,
	html: string,
	recipientEmail: string,
): Promise<string> {
	const unsubUrl = await signUnsubscribeUrl(env, recipientEmail);
	const escapedEmail = escapeHtml(recipientEmail);
	const escapedUrl = escapeHtml(unsubUrl);
	const footer = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #eee;padding-top:16px;">
<tr><td align="center" style="font-size:12px;color:#888;text-align:center;line-height:1.6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
<a href="${escapedUrl}" style="color:#888;text-decoration:underline;">Unsubscribe</a>
&nbsp;·&nbsp;
<a href="https://kibay.com.do" style="color:#888;text-decoration:underline;">Kibay</a>
<br/>
Sent to ${escapedEmail}
</td></tr></table>`;
	if (/<\/body>/i.test(html)) {
		return html.replace(/<\/body>/i, `${footer}</body>`);
	}
	return html + footer;
}

function emailMarketingHeaders(env: Env): Record<string, string> {
	return {
		apikey: env.SUPABASE_SERVICE_ROLE_KEY,
		Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
		'Content-Type': 'application/json',
	};
}

async function loadCampaign(env: Env, id: string): Promise<CampaignRow | null> {
	const u = `${env.SUPABASE_URL}/rest/v1/email_campaigns?id=eq.${encodeURIComponent(
		id,
	)}&select=id,name,subject,html_content,from_name,from_email,reply_to,segment_filter,status&limit=1`;
	const r = await fetch(u, { headers: emailMarketingHeaders(env) });
	if (!r.ok) return null;
	const rows = (await r.json()) as CampaignRow[];
	return rows[0] ?? null;
}

async function patchCampaign(
	env: Env,
	id: string,
	fields: Record<string, unknown>,
): Promise<void> {
	const u = `${env.SUPABASE_URL}/rest/v1/email_campaigns?id=eq.${encodeURIComponent(id)}`;
	const r = await fetch(u, {
		method: 'PATCH',
		headers: emailMarketingHeaders(env),
		body: JSON.stringify(fields),
	});
	if (!r.ok) throw new Error(`campaign patch failed: ${r.status} ${await r.text()}`);
}

async function loadContactsByEmails(env: Env, emails: string[]): Promise<ContactRow[]> {
	if (emails.length === 0) return [];
	// PostgREST `in.()` with quoted strings to be email-safe.
	const list = emails
		.map((e) => `"${e.replace(/"/g, '\\"')}"`)
		.join(',');
	const u = `${env.SUPABASE_URL}/rest/v1/email_contacts?email=in.(${encodeURIComponent(
		list,
	)})&select=id,email,first_name,last_name,segment,subtype_tags,merge_vars,status`;
	const r = await fetch(u, { headers: emailMarketingHeaders(env) });
	if (!r.ok) throw new Error(`contact lookup failed: ${r.status} ${await r.text()}`);
	return (await r.json()) as ContactRow[];
}

async function loadContactsBySegment(env: Env, filter: SegmentFilter): Promise<ContactRow[]> {
	// Always exclude unsubscribed + bounced (never email them again).
	// Default to status='active' unless overridden.
	const status = filter.status || 'active';
	const params: string[] = [
		'select=id,email,first_name,last_name,segment,subtype_tags,merge_vars,status',
		`status=eq.${encodeURIComponent(status)}`,
	];
	if (filter.segments && filter.segments.length > 0) {
		const seg = filter.segments
			.map((s) => `"${s.replace(/"/g, '\\"')}"`)
			.join(',');
		params.push(`segment=in.(${encodeURIComponent(seg)})`);
	}
	if (filter.tags && filter.tags.length > 0) {
		// subtype_tags is a TEXT[]; PostgREST overlap operator is `ov`, formatted
		// as `subtype_tags=ov.{tag1,tag2}`.
		const tagList = filter.tags
			.map((t) => `"${t.replace(/"/g, '\\"')}"`)
			.join(',');
		params.push(`subtype_tags=ov.{${encodeURIComponent(tagList)}}`);
	}
	const u = `${env.SUPABASE_URL}/rest/v1/email_contacts?${params.join('&')}`;
	const r = await fetch(u, { headers: emailMarketingHeaders(env) });
	if (!r.ok) throw new Error(`contact segment query failed: ${r.status} ${await r.text()}`);
	const rows = (await r.json()) as ContactRow[];
	// Belt-and-suspenders: filter out unsubscribed/bounced in case caller passed a
	// status filter that doesn't exclude them.
	return rows.filter((c) => c.status !== 'unsubscribed' && c.status !== 'bounced');
}

interface EmailLogInsert {
	campaign_id: string | null;
	recipient: string;
	contact_id: string | null;
	message_id: string | null;
	campaign_type: string | null;
	status: string;
	sent_at?: string;
	bounce_reason?: string;
}

async function insertEmailLog(env: Env, row: EmailLogInsert): Promise<void> {
	const u = `${env.SUPABASE_URL}/rest/v1/email_logs`;
	const r = await fetch(u, {
		method: 'POST',
		headers: emailMarketingHeaders(env),
		body: JSON.stringify(row),
	});
	if (!r.ok) throw new Error(`email_logs insert failed: ${r.status} ${await r.text()}`);
}

async function patchContactStatusByEmail(
	env: Env,
	email: string,
	status: string,
): Promise<void> {
	const u = `${env.SUPABASE_URL}/rest/v1/email_contacts?email=eq.${encodeURIComponent(email)}`;
	const r = await fetch(u, {
		method: 'PATCH',
		headers: emailMarketingHeaders(env),
		body: JSON.stringify({ status }),
	});
	if (!r.ok) throw new Error(`contact patch failed: ${r.status} ${await r.text()}`);
}

// ---- Brevo webhook ---------------------------------------------------------

interface BrevoEvent {
	event?: string;
	email?: string;
	'message-id'?: string;
	date?: string;
	reason?: string;
	tag?: string;
	[k: string]: unknown;
}

async function handleBrevoEvent(env: Env, ev: BrevoEvent): Promise<void> {
	const eventName = (ev.event || '').toLowerCase();
	const messageId = ev['message-id'];
	const email = ev.email;
	if (!messageId) {
		console.warn('brevo webhook: event missing message-id', ev);
		return;
	}

	const patch: Record<string, unknown> = { raw_event: ev };
	let alsoSuppressContact: 'unsubscribed' | 'bounced' | null = null;
	let skipIfAlreadyOpened = false;
	let onlyIfStatusNotTerminal = false;

	switch (eventName) {
		case 'request':
		case 'sent':
			patch.status = 'sent';
			if (ev.date) patch.sent_at = new Date(ev.date).toISOString();
			onlyIfStatusNotTerminal = true;
			break;
		case 'delivered':
			patch.status = 'delivered';
			patch.delivered_at = ev.date ? new Date(ev.date).toISOString() : new Date().toISOString();
			break;
		case 'opened':
		case 'unique_opened':
			patch.status = 'opened';
			patch.opened_at = ev.date ? new Date(ev.date).toISOString() : new Date().toISOString();
			if (typeof ev.ip === 'string') patch.ip_address = ev.ip;
			if (typeof ev.user_agent === 'string') patch.user_agent = ev.user_agent;
			skipIfAlreadyOpened = true;
			break;
		case 'click':
		case 'clicked':
			patch.status = 'clicked';
			patch.clicked_at = ev.date ? new Date(ev.date).toISOString() : new Date().toISOString();
			if (typeof ev.ip === 'string') patch.ip_address = ev.ip;
			if (typeof ev.user_agent === 'string') patch.user_agent = ev.user_agent;
			break;
		case 'hard_bounce':
			patch.status = 'bounced';
			patch.bounced_at = ev.date ? new Date(ev.date).toISOString() : new Date().toISOString();
			if (ev.reason) patch.bounce_reason = ev.reason;
			alsoSuppressContact = 'bounced';
			break;
		case 'soft_bounce':
			patch.status = 'soft_bounced';
			patch.bounced_at = ev.date ? new Date(ev.date).toISOString() : new Date().toISOString();
			if (ev.reason) patch.bounce_reason = ev.reason;
			break;
		case 'spam':
			patch.status = 'spam';
			break;
		case 'unsubscribed':
			patch.status = 'unsubscribed';
			alsoSuppressContact = 'unsubscribed';
			break;
		case 'blocked':
			patch.status = 'blocked';
			if (ev.reason) patch.bounce_reason = ev.reason;
			break;
		case 'deferred':
			patch.status = 'deferred';
			if (ev.reason) patch.bounce_reason = ev.reason;
			break;
		default:
			console.warn(`brevo webhook: unhandled event '${eventName}'`);
			// Still store the raw event so we can diagnose later.
			break;
	}

	// Update email_logs row by message_id. PostgREST returns 200 with empty array
	// when no row matches — we don't treat that as an error (Brevo can race).
	let query = `${env.SUPABASE_URL}/rest/v1/email_logs?message_id=eq.${encodeURIComponent(messageId)}`;
	if (skipIfAlreadyOpened) {
		// Don't downgrade clicked → opened, and don't re-stamp opened_at if already set.
		query += '&opened_at=is.null&status=neq.clicked';
	}
	if (onlyIfStatusNotTerminal) {
		// 'sent' shouldn't overwrite a more advanced state (delivered/opened/clicked/bounced).
		query += '&status=in.(queued,failed)';
	}
	const r = await fetch(query, {
		method: 'PATCH',
		headers: { ...emailMarketingHeaders(env), Prefer: 'return=representation' },
		body: JSON.stringify(patch),
	});
	if (!r.ok) {
		console.error(`brevo webhook: log patch failed: ${r.status} ${await r.text()}`);
	} else {
		const updated = (await r.json()) as unknown[];
		if (!updated.length) {
			console.warn(
				`brevo webhook: no email_logs row matched message_id=${messageId} (event=${eventName})`,
			);
		}
	}

	if (alsoSuppressContact && email) {
		try {
			await patchContactStatusByEmail(env, email, alsoSuppressContact);
		} catch (e) {
			console.error(`brevo webhook: contact suppress (${alsoSuppressContact}) failed:`, e);
		}
	}
}

// ============================================================================
// Calendar (.ics) handler
// ============================================================================
//
// Returns a text/calendar response containing one VEVENT per experience line
// item attached to the given order. AST (UTC-4, no DST) is the canonical zone
// for reservation_date/reservation_time as stored on order_items.metadata.

interface OrderRow {
	id: string;
	order_number: string;
}

interface OrderItemRow {
	id: string;
	product_id: string;
	product_name: string;
	metadata: {
		reservation_date?: string;
		reservation_time?: string;
		duration_minutes?: number;
	} | null;
}

interface ProductRow {
	id: string;
	metadata: { duration_minutes?: number } | null;
}

const AST_OFFSET_MIN_CAL = 4 * 60;

function calReservationToUtc(dateStr: string, timeStr: string): Date {
	const [y, m, d] = dateStr.split('-').map(Number);
	const [hh, mm] = timeStr.split(':').map(Number);
	return new Date(
		Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0) + AST_OFFSET_MIN_CAL * 60 * 1000,
	);
}

function calFmtIcsUtc(d: Date): string {
	const pad = (n: number): string => String(n).padStart(2, '0');
	return (
		`${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
		`T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
	);
}

// ICS allows arbitrary text in DESCRIPTION/SUMMARY/LOCATION but special chars
// must be escaped: backslash, comma, semicolon, newline.
function icsEscape(s: string): string {
	return String(s)
		.replace(/\\/g, '\\\\')
		.replace(/\n/g, '\\n')
		.replace(/,/g, '\\,')
		.replace(/;/g, '\\;');
}

// RFC 5545: content lines MUST NOT exceed 75 octets. Long lines fold by
// inserting CRLF + single space (or tab) before continuation. We count by
// UTF-8 byte length, not JS string length, so emoji/accents fold correctly.
function icsFoldLine(line: string): string {
	const encoder = new TextEncoder();
	const out: string[] = [];
	let buf = '';
	let len = 0;
	for (const ch of line) {
		const chLen = encoder.encode(ch).length;
		if (len + chLen > 75) {
			out.push(buf);
			buf = ' ' + ch; // leading space marks continuation
			len = 1 + chLen;
		} else {
			buf += ch;
			len += chLen;
		}
	}
	if (buf) out.push(buf);
	return out.join('\r\n');
}

function buildIcs(orderNumber: string, events: Array<{
	uid: string;
	summary: string;
	startUtc: Date;
	endUtc: Date;
	location: string;
	description: string;
}>): string {
	const nowStamp = calFmtIcsUtc(new Date());
	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Kibay//Reservations//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
	];
	for (const ev of events) {
		lines.push('BEGIN:VEVENT');
		lines.push(`UID:${ev.uid}`);
		lines.push(`DTSTAMP:${nowStamp}`);
		lines.push(`DTSTART:${calFmtIcsUtc(ev.startUtc)}`);
		lines.push(`DTEND:${calFmtIcsUtc(ev.endUtc)}`);
		lines.push(`SUMMARY:${icsEscape(ev.summary)}`);
		lines.push(`LOCATION:${icsEscape(ev.location)}`);
		lines.push(`DESCRIPTION:${icsEscape(ev.description)}`);
		lines.push('STATUS:CONFIRMED');
		lines.push('END:VEVENT');
	}
	lines.push('END:VCALENDAR');
	return lines.map(icsFoldLine).join('\r\n') + '\r\n';
}

async function handleCalendarIcs(env: Env, orderId: string, sig: string): Promise<Response> {
	if (!sig) return new Response('missing sig', { status: 400 });
	const ok = await verifyCalendarToken(env, orderId, sig);
	if (!ok) return new Response('invalid signature', { status: 403 });

	// Fetch order + items via service-role REST. We only need the basics here.
	const headers = {
		apikey: env.SUPABASE_SERVICE_ROLE_KEY,
		Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
	};

	const orderResp = await fetch(
		`${env.SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number&limit=1`,
		{ headers },
	);
	if (!orderResp.ok) {
		console.error('calendar: order fetch failed', orderResp.status, await orderResp.text());
		return new Response('order lookup failed', { status: 500 });
	}
	const orders = (await orderResp.json()) as OrderRow[];
	if (!orders.length) return new Response('order not found', { status: 404 });
	const order = orders[0];

	const itemsResp = await fetch(
		`${env.SUPABASE_URL}/rest/v1/order_items?order_id=eq.${encodeURIComponent(orderId)}&select=id,product_id,product_name,metadata`,
		{ headers },
	);
	if (!itemsResp.ok) {
		console.error('calendar: items fetch failed', itemsResp.status, await itemsResp.text());
		return new Response('items lookup failed', { status: 500 });
	}
	const items = (await itemsResp.json()) as OrderItemRow[];
	const reservations = items.filter((i) => i.metadata?.reservation_date);
	if (reservations.length === 0) {
		// No experience lines on this order — return an empty (but valid) calendar
		// rather than a 404. Keeps the email button benign for mixed orders.
		const empty = buildIcs(order.order_number, []);
		return new Response(empty, {
			headers: {
				'Content-Type': 'text/calendar; charset=utf-8',
				'Content-Disposition': 'attachment; filename="kibay-reservation.ics"',
			},
		});
	}

	// Hydrate duration_minutes from products.metadata when the order_item didn't
	// carry it. Default fallback is 120 minutes (2h) for any experience whose
	// product row has no explicit duration.
	const productIds = Array.from(new Set(reservations.map((r) => r.product_id).filter(Boolean)));
	const durationByProduct = new Map<string, number>();
	if (productIds.length > 0) {
		const idList = productIds
			.map((p) => `"${p.replace(/"/g, '\\"')}"`)
			.join(',');
		const prodResp = await fetch(
			`${env.SUPABASE_URL}/rest/v1/products?id=in.(${encodeURIComponent(idList)})&select=id,metadata`,
			{ headers },
		);
		if (prodResp.ok) {
			const prodRows = (await prodResp.json()) as ProductRow[];
			for (const p of prodRows) {
				if (typeof p.metadata?.duration_minutes === 'number') {
					durationByProduct.set(p.id, p.metadata.duration_minutes);
				}
			}
		}
	}

	const location = 'Bahía de Ocoa, Km 6/12 Hatillo, Azua 71003, DO';
	const events = reservations.map((r) => {
		const date = r.metadata!.reservation_date!;
		const time = r.metadata!.reservation_time || '11:00';
		const startUtc = calReservationToUtc(date, time);
		const durationMin =
			r.metadata?.duration_minutes ?? durationByProduct.get(r.product_id) ?? 120;
		const endUtc = new Date(startUtc.getTime() + durationMin * 60 * 1000);
		return {
			uid: `kibay-${order.id}-${r.id}@kibay.com.do`,
			summary: `Reserva Kibay: ${r.product_name}`,
			startUtc,
			endUtc,
			location,
			description: `Orden ${order.order_number} — Kibay reservation at Bahía de Ocoa. Questions: info@kibay.com.do`,
		};
	});

	const body = buildIcs(order.order_number, events);
	return new Response(body, {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': 'attachment; filename="kibay-reservation.ics"',
		},
	});
}

function firstSentenceFromHtml(html: string): string {
	// Strip tags + collapse whitespace, take first ~280 chars or first sentence.
	const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
	const sentenceEnd = text.search(/[.!?](\s|$)/);
	const cut = sentenceEnd > 60 ? sentenceEnd + 1 : Math.min(text.length, 280);
	const out = text.slice(0, cut).trim();
	return out.length === text.length ? out : out + '…';
}

// ---------------------------------------------------------------------------
// Newsletter admin notice — short internal-style email to info@kibay.com.do
// when a new public subscriber lands. Lightweight, no marketing chrome.
// ---------------------------------------------------------------------------
function renderNewsletterAdminNotice(email: string, firstName: string): string {
	const when = new Date().toLocaleString('es-DO', { timeZone: 'America/Santo_Domingo' });
	return `<!doctype html><html><body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1c1917;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:24px 16px;background:#f5f5f4;"><tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#ffffff;border:1px solid #e7e5e4;border-radius:8px;">
  <tr><td style="padding:20px 24px;border-bottom:1px solid #e7e5e4;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#a8a29e;">Kibay admin · newsletter</div>
    <h1 style="margin:4px 0 0;font-size:18px;font-weight:600;color:#1c1917;">Nuevo suscriptor</h1>
  </td></tr>
  <tr><td style="padding:20px 24px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-size:13px;color:#44403c;">
      <tr><td style="padding:4px 0;color:#78716c;width:130px;">Email</td><td style="padding:4px 0;font-family:Menlo,Consolas,monospace;color:#1c1917;">${escapeHtml(email)}</td></tr>
      ${firstName ? `<tr><td style="padding:4px 0;color:#78716c;">Nombre</td><td style="padding:4px 0;">${escapeHtml(firstName)}</td></tr>` : ''}
      <tr><td style="padding:4px 0;color:#78716c;">Fuente</td><td style="padding:4px 0;">Formulario footer</td></tr>
      <tr><td style="padding:4px 0;color:#78716c;">Hora (AST)</td><td style="padding:4px 0;">${escapeHtml(when)}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:0 24px 24px;">
    <a href="https://kibay.com.do/admin/email/contacts" style="display:inline-block;padding:10px 16px;background:#1c1917;color:#ffffff;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;">Ver en /admin/email/contacts</a>
  </td></tr>
</table></td></tr></table>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Newsletter welcome email — fired after a public footer signup.
// ---------------------------------------------------------------------------
function renderWelcomeEmail(firstName: string, unsubUrl: string): string {
	const greeting = firstName ? `Hola ${escapeHtml(firstName)},` : 'Hola,';
	return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;background:#f4f4f0;">
    <tr><td align="center">
      <table role="presentation" width="560" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.06);">
        <tr><td style="padding:32px 40px 0;" align="center">
          <div style="font-family:Georgia,serif;font-size:30px;font-weight:600;letter-spacing:1.5px;color:#1a1a1a;">Kibay</div>
          <div style="height:2px;width:56px;background:#D4A574;margin:12px auto 0;"></div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#aaa;margin-top:10px;">Vino Espumoso Orgánico del Caribe</div>
        </td></tr>
        <tr><td style="padding:32px 40px 8px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#999;">Bienvenido/a a la lista</div>
          <h1 style="margin:10px 0 0;font-size:24px;font-weight:600;line-height:1.3;">${greeting} gracias por suscribirte</h1>
          <p style="margin:14px 0 0;color:#666;font-size:15px;line-height:1.65;">Ya estás en la lista de Kibay. Te escribiremos de vez en cuando — sin spam, sin prisa.</p>
        </td></tr>
        <tr><td style="padding:12px 40px 0;">
          <p style="margin:0;color:#444;font-size:15px;line-height:1.65;">Qué esperar:</p>
          <ul style="margin:8px 0 0;padding-left:20px;color:#444;font-size:15px;line-height:1.7;">
            <li>Historias de Bahía de Ocoa, nuestra bodega en el sur dominicano.</li>
            <li>Lanzamientos de añada y nuevas etiquetas (próximamente Rosé y French Colombard 2026).</li>
            <li>Invitaciones a catas y visitas a la bodega.</li>
            <li>Ofertas exclusivas que no aparecen en redes.</li>
          </ul>
        </td></tr>
        <tr><td style="padding:18px 40px 6px;">
          <div style="border-left:3px solid #D4A574;padding:6px 16px;color:#555;font-style:italic;font-size:15px;line-height:1.55;">
            "Caribe en una copa. Orgánico, brillante, hecho a 90 minutos de Santo Domingo."
          </div>
        </td></tr>
        <tr><td style="padding:28px 40px 8px;" align="center">
          <a href="https://kibay.com.do/shop" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">Explorar la tienda</a>
        </td></tr>
        <tr><td style="padding:6px 40px 32px;" align="center">
          <a href="https://kibay.com.do/vine-and-barrel" style="color:#888;font-size:13px;text-decoration:underline;">O reserva una visita a la bodega →</a>
        </td></tr>
        <tr><td style="padding:0 40px;"><div style="height:1px;background:#eee;"></div></td></tr>
        <tr><td style="padding:24px 40px 28px;text-align:center;">
          <div style="font-family:Georgia,serif;font-size:18px;font-weight:600;color:#1a1a1a;letter-spacing:0.5px;">Kibay</div>
          <div style="font-size:12px;color:#777;margin-top:6px;line-height:1.5;max-width:380px;margin-left:auto;margin-right:auto;">Vino orgánico premium de la República Dominicana. Elaborado con pasión, sostenibilidad y los mejores frutos locales.</div>
          <div style="font-size:11px;color:#999;margin-top:14px;">Bahía de Ocoa, Km 6 1/2 Hatillo, Azua 71003 · República Dominicana</div>
          <div style="margin-top:18px;">
            <a href="https://www.instagram.com/kibaywine" style="display:inline-block;margin:0 6px;color:#888;font-size:12px;text-decoration:none;">Instagram</a><span style="color:#ddd;">·</span>
            <a href="https://www.facebook.com/profile.php?id=61589761255222" style="display:inline-block;margin:0 6px;color:#888;font-size:12px;text-decoration:none;">Facebook</a><span style="color:#ddd;">·</span>
            <a href="https://www.tiktok.com/@kibaywine" style="display:inline-block;margin:0 6px;color:#888;font-size:12px;text-decoration:none;">TikTok</a><span style="color:#ddd;">·</span>
            <a href="https://www.linkedin.com/company/116054911" style="display:inline-block;margin:0 6px;color:#888;font-size:12px;text-decoration:none;">LinkedIn</a>
          </div>
          <div style="font-size:11px;color:#aaa;margin-top:16px;">
            <a href="${unsubUrl}" style="color:#aaa;text-decoration:underline;">Cancelar suscripción</a> · <a href="https://kibay.com.do" style="color:#aaa;text-decoration:none;">kibay.com.do</a>
          </div>
          <div style="font-size:10px;color:#bbb;margin-top:14px;letter-spacing:0.5px;text-transform:uppercase;">© Kibay · Hecho en la República Dominicana</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
