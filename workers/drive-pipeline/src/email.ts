// Brevo transactional email + HMAC-signed approve/reject magic links.

export interface EmailEnv {
	BREVO_API_KEY: string;
	REVIEW_EMAIL_TO: string;
	REVIEW_EMAIL_FROM: string;
	EMAIL_LINK_SECRET: string;
	SITE_URL: string;
	WORKER_BASE_URL: string;
}

function b64url(input: ArrayBuffer | string): string {
	const bytes =
		typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacHex(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
	return Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function signActionUrl(
	env: EmailEnv,
	action: 'approve' | 'reject',
	postId: string,
	ttlSeconds = 7 * 24 * 60 * 60,
): Promise<string> {
	const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
	const payload = `${postId}.${action}.${exp}`;
	const sig = await hmacHex(env.EMAIL_LINK_SECRET, payload);
	const qs = new URLSearchParams({ id: postId, exp: String(exp), sig });
	return `${env.WORKER_BASE_URL}/${action}?${qs.toString()}`;
}

export async function verifyActionToken(
	env: EmailEnv,
	action: 'approve' | 'reject',
	postId: string,
	exp: string,
	sig: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
	const expNum = Number(exp);
	if (!Number.isFinite(expNum)) return { ok: false, reason: 'bad_exp' };
	if (Math.floor(Date.now() / 1000) > expNum) return { ok: false, reason: 'expired' };
	const expected = await hmacHex(env.EMAIL_LINK_SECRET, `${postId}.${action}.${expNum}`);
	if (expected.length !== sig.length) return { ok: false, reason: 'bad_sig' };
	let m = 0;
	for (let i = 0; i < expected.length; i++) {
		m |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
	}
	return m === 0 ? { ok: true } : { ok: false, reason: 'bad_sig' };
}

interface ReviewEmailInput {
	postId: string;
	titleEn: string;
	titleEs: string;
	slug: string;
	imageUrl: string;
	bodyExcerptEn: string;
	bodyExcerptEs: string;
	driveFilename: string;
}

export async function sendReviewEmail(env: EmailEnv, post: ReviewEmailInput): Promise<void> {
	const approveUrl = await signActionUrl(env, 'approve', post.postId);
	const rejectUrl = await signActionUrl(env, 'reject', post.postId);
	const previewUrl = `${env.SITE_URL}/blog/${post.slug}`;

	const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f0;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
  <tr><td style="padding:24px 28px 8px;">
    <div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#999;">Kibay — new auto-draft</div>
    <h1 style="margin:8px 0 4px;font-size:22px;font-weight:600;line-height:1.3;">${escapeHtml(post.titleEn)}</h1>
    <div style="font-size:15px;color:#666;font-style:italic;margin-bottom:8px;">${escapeHtml(post.titleEs)}</div>
    <div style="font-size:12px;color:#aaa;">from <code>${escapeHtml(post.driveFilename)}</code></div>
  </td></tr>
  <tr><td style="padding:8px 28px;">
    <img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(post.titleEn)}" width="544" style="display:block;width:100%;max-width:544px;height:auto;border-radius:8px;" />
  </td></tr>
  <tr><td style="padding:16px 28px 4px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:4px;">English excerpt</div>
    <div style="font-size:14px;line-height:1.6;color:#333;">${escapeHtml(post.bodyExcerptEn)}</div>
  </td></tr>
  <tr><td style="padding:12px 28px 4px;">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999;margin-bottom:4px;">Spanish excerpt</div>
    <div style="font-size:14px;line-height:1.6;color:#333;">${escapeHtml(post.bodyExcerptEs)}</div>
  </td></tr>
  <tr><td style="padding:24px 28px;" align="center">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:8px;">
        <a href="${approveUrl}" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Approve &amp; Publish</a>
      </td>
      <td style="padding-left:8px;">
        <a href="${rejectUrl}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;">Reject</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:8px 28px 24px;font-size:12px;color:#999;text-align:center;">
    Preview the full draft: <a href="${previewUrl}" style="color:#666;">${escapeHtml(post.slug)}</a><br/>
    Links valid for 7 days. Rejecting deletes the draft and prevents reprocessing.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

	const fromMatch = env.REVIEW_EMAIL_FROM.match(/^(.*)<(.+@.+)>\s*$/);
	const sender = fromMatch
		? { name: fromMatch[1].trim().replace(/"/g, ''), email: fromMatch[2].trim() }
		: { email: env.REVIEW_EMAIL_FROM.trim() };

	const r = await fetch('https://api.brevo.com/v3/smtp/email', {
		method: 'POST',
		headers: {
			'api-key': env.BREVO_API_KEY,
			'content-type': 'application/json',
			accept: 'application/json',
		},
		body: JSON.stringify({
			sender,
			to: [{ email: env.REVIEW_EMAIL_TO }],
			subject: `[Kibay] Review auto-draft: ${post.titleEn}`,
			htmlContent: html,
		}),
	});
	if (!r.ok) throw new Error(`Brevo send failed: ${r.status} ${await r.text()}`);
}

export function actionResultPage(action: 'approve' | 'reject', success: boolean, message: string): Response {
	const verb = action === 'approve' ? 'Approved' : 'Rejected';
	const color = success ? (action === 'approve' ? '#16a34a' : '#dc2626') : '#666';
	const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${verb}</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#f4f4f0;margin:0;padding:0;min-height:100vh;display:flex;align-items:center;justify-content:center;}
.card{background:#fff;padding:48px 40px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08);max-width:440px;text-align:center;}
h1{margin:0 0 12px;font-size:24px;color:${color};}
p{margin:0;color:#666;line-height:1.5;}
a{color:#888;font-size:13px;display:inline-block;margin-top:24px;}</style>
</head><body><div class="card">
<h1>${success ? verb : 'Action failed'}</h1>
<p>${escapeHtml(message)}</p>
<a href="https://kibay.com.do/blog">Back to Kibay blog</a>
</div></body></html>`;
	return new Response(html, {
		status: success ? 200 : 400,
		headers: { 'content-type': 'text/html; charset=utf-8' },
	});
}

function escapeHtml(s: string): string {
	return String(s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
