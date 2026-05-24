// Cloudflare Email Worker — inbound parsing.
// =============================================================================
// Wired up via Cloudflare Email Routing's "send to Worker" route on
// kibay.com.do (configured in dashboard: Email → Email Routing → Routes).
// Every email to `*@reply.kibay.com.do` (or whichever subdomain you point
// at this Worker) flows through here.
//
// We:
//   1. Parse the raw RFC-5322 with postal-mime
//   2. Extract DKIM/SPF/DMARC pass/fail (already verified by CF before reaching us)
//   3. HMAC-SHA256 sign the JSON payload
//   4. POST to https://<project>.supabase.co/functions/v1/ai-email-inbound
//
// Auth model: shared HMAC secret with the Edge Function so a third party
// can't spoof inbound emails by POSTing directly to the function URL.
//
// Idempotency: handled in the Edge Function (dedup on RFC-5322 message_id).
// CF auto-retries non-2xx, so we just `throw` on errors.

import PostalMime from 'postal-mime';

export interface Env {
	AI_EMAIL_INBOUND_SECRET: string;
	SUPABASE_FUNCTIONS_URL: string; // https://<ref>.supabase.co/functions/v1
}

async function hmacSha256Hex(message: string, secret: string): Promise<string> {
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey(
		'raw',
		enc.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const buf = await crypto.subtle.sign('HMAC', key, enc.encode(message));
	return Array.from(new Uint8Array(buf))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export default {
	async email(message: ForwardableEmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
		if (!env.AI_EMAIL_INBOUND_SECRET || !env.SUPABASE_FUNCTIONS_URL) {
			console.error('email-inbound: missing secrets — AI_EMAIL_INBOUND_SECRET or SUPABASE_FUNCTIONS_URL');
			message.setReject('Internal configuration error');
			return;
		}

		try {
			const rawText = await new Response(message.raw).text();
			const parsed = await PostalMime.parse(rawText);

			// Authentication-Results header is added by Cloudflare upstream
			// based on DKIM/SPF/DMARC verification. We parse it to surface
			// the pass/fail status to the Edge Function.
			const authResults = (parsed.headers || []).find((h) =>
				h.key.toLowerCase() === 'authentication-results',
			)?.value || '';
			const dkimPass = /dkim=pass/i.test(authResults);
			const spfPass = /spf=pass/i.test(authResults);
			const dmarcPass = /dmarc=pass/i.test(authResults);

			const payload = {
				to: message.to,
				from: message.from,
				messageId: parsed.messageId || `<no-id-${Date.now()}@unknown>`,
				inReplyTo: parsed.inReplyTo || null,
				references: parsed.references
					? Array.isArray(parsed.references)
						? parsed.references
						: String(parsed.references).split(/\s+/).filter(Boolean)
					: [],
				subject: parsed.subject || '',
				bodyText: parsed.text || '',
				bodyHtml: parsed.html || '',
				headers: Object.fromEntries((parsed.headers || []).map((h) => [h.key, h.value])),
				dkim: dkimPass,
				spf: spfPass,
				dmarc: dmarcPass,
			};

			const bodyStr = JSON.stringify(payload);
			const signature = await hmacSha256Hex(bodyStr, env.AI_EMAIL_INBOUND_SECRET);

			const resp = await fetch(`${env.SUPABASE_FUNCTIONS_URL}/ai-email-inbound`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-aho-signature': signature,
				},
				body: bodyStr,
			});

			if (!resp.ok) {
				const detail = await resp.text().catch(() => '');
				console.error(`email-inbound: edge func ${resp.status} — ${detail.slice(0, 300)}`);
				// Throw so CF retries the email later.
				throw new Error(`edge func ${resp.status}`);
			}

			// Success — Email Routing will mark this message handled and stop forwarding.
		} catch (e) {
			console.error('email-inbound: handler threw', e);
			throw e; // CF retries
		}
	},
};
