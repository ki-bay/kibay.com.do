import { listFolderImages, downloadDriveFile } from './drive';
import { generateBlogFromImage } from './anthropic';
import {
	isFileProcessed,
	uploadImage,
	insertBlogPost,
	recordProcessed,
	setPostPublished,
	deletePost,
	markProcessedStatus,
	SupabaseEnv,
} from './supabase';
import {
	sendReviewEmail,
	verifyActionToken,
	actionResultPage,
	EmailEnv,
} from './email';
import type { ServiceAccount } from './jwt';

interface Env extends SupabaseEnv, EmailEnv {
	GOOGLE_SERVICE_ACCOUNT_JSON: string;
	GOOGLE_DRIVE_FOLDER_ID: string;
	ANTHROPIC_API_KEY: string;
	ANTHROPIC_MODEL: string;
}

export default {
	async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(runPipeline(env));
	},

	async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(req.url);

		if (url.pathname === '/health') return new Response('ok');

		if (url.pathname === '/approve' && req.method === 'GET') {
			return handleAction(req, env, 'approve');
		}
		if (url.pathname === '/reject' && req.method === 'GET') {
			return handleAction(req, env, 'reject');
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

	const files = await listFolderImages(sa, env.GOOGLE_DRIVE_FOLDER_ID);
	console.log(`pipeline: scanning ${files.length} files in folder`);

	for (const f of files) {
		try {
			if (await isFileProcessed(env, f.id)) continue;
			console.log(`pipeline: processing ${f.name} (${f.id})`);

			const { bytes, contentType } = await downloadDriveFile(sa, f.id);
			const ext = (f.name.match(/\.([a-z0-9]+)$/i)?.[1] || 'jpg').toLowerCase();
			const storagePath = `auto/${f.id}.${ext}`;
			const imageUrl = await uploadImage(env, storagePath, bytes, contentType);

			const post = await generateBlogFromImage(
				env.ANTHROPIC_API_KEY,
				env.ANTHROPIC_MODEL,
				bytes,
				contentType,
				f.name,
			);

			const slug = makeUniqueSlug(post.slug, f.id);
			const blogRow = {
				title: post.title_en,
				slug,
				description: post.seo_description_en,
				content: htmlFromMarkdown(post.body_en),
				featured_image_url: imageUrl,
				alt_text: post.alt_text,
				seo_title: post.title_en,
				seo_description: post.seo_description_en,
				seo_keywords: post.tags.join(', '),
				published: false,
				source: 'drive_auto',
				auto_draft_meta: {
					drive_file_id: f.id,
					drive_filename: f.name,
					drive_modified_time: f.modifiedTime,
					es: {
						title: post.title_es,
						body_markdown: post.body_es,
						body_html: htmlFromMarkdown(post.body_es),
						seo_description: post.seo_description_es,
					},
					social: {
						facebook: post.caption_facebook,
						instagram: post.caption_instagram,
						linkedin: post.caption_linkedin,
					},
					model: env.ANTHROPIC_MODEL,
				},
			};

			const inserted = await insertBlogPost(env, blogRow);
			await recordProcessed(env, {
				file_id: f.id,
				drive_modified_time: f.modifiedTime,
				blog_post_id: inserted.id,
				status: 'draft_pending',
			});

			await sendReviewEmail(env, {
				postId: inserted.id,
				titleEn: post.title_en,
				titleEs: post.title_es,
				slug,
				imageUrl,
				bodyExcerptEn: firstParagraph(post.body_en),
				bodyExcerptEs: firstParagraph(post.body_es),
				driveFilename: f.name,
			});
		} catch (e) {
			console.error(`pipeline: failed for ${f.id} (${f.name}):`, e);
			try {
				await recordProcessed(env, {
					file_id: f.id,
					drive_modified_time: f.modifiedTime,
					blog_post_id: null,
					status: 'failed',
				});
			} catch {
				/* swallow */
			}
		}
	}
}

async function handleAction(
	req: Request,
	env: Env,
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
			return actionResultPage(
				'approve',
				true,
				'The post is now live on the Kibay blog.',
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

function firstParagraph(md: string): string {
	const para = md.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith('#')) || md;
	const stripped = para.replace(/\n/g, ' ').replace(/[#*_`]/g, '').trim();
	return stripped.length > 280 ? stripped.slice(0, 277) + '…' : stripped;
}

function htmlFromMarkdown(md: string): string {
	const lines = md.split('\n');
	const out: string[] = [];
	let para: string[] = [];
	const flush = () => {
		if (para.length) {
			out.push(`<p>${escapeHtml(para.join(' '))}</p>`);
			para = [];
		}
	};
	for (const line of lines) {
		const t = line.trim();
		if (!t) {
			flush();
			continue;
		}
		const h = t.match(/^(#{1,3})\s+(.+)/);
		if (h) {
			flush();
			out.push(`<h${h[1].length}>${escapeHtml(h[2])}</h${h[1].length}>`);
			continue;
		}
		para.push(t);
	}
	flush();
	return out.join('\n');
}

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
