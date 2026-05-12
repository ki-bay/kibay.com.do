// RS256 JWT signing for Google service-account auth, using Web Crypto.

function base64UrlEncode(input: string | ArrayBuffer): string {
	const bytes =
		typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
	let bin = '';
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
	const b64 = pem
		.replace(/-----BEGIN PRIVATE KEY-----/, '')
		.replace(/-----END PRIVATE KEY-----/, '')
		.replace(/\s+/g, '');
	const bin = atob(b64);
	const buf = new ArrayBuffer(bin.length);
	const view = new Uint8Array(buf);
	for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
	return buf;
}

export interface ServiceAccount {
	client_email: string;
	private_key: string;
	token_uri?: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getGoogleAccessToken(
	sa: ServiceAccount,
	scopes: string[],
): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	if (cachedToken && cachedToken.expiresAt > now + 30) return cachedToken.token;

	const header = { alg: 'RS256', typ: 'JWT' };
	const payload = {
		iss: sa.client_email,
		scope: scopes.join(' '),
		aud: sa.token_uri || 'https://oauth2.googleapis.com/token',
		iat: now,
		exp: now + 3600,
	};
	const headerB64 = base64UrlEncode(JSON.stringify(header));
	const payloadB64 = base64UrlEncode(JSON.stringify(payload));
	const data = `${headerB64}.${payloadB64}`;

	const key = await crypto.subtle.importKey(
		'pkcs8',
		pemToArrayBuffer(sa.private_key),
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const sig = await crypto.subtle.sign(
		'RSASSA-PKCS1-v1_5',
		key,
		new TextEncoder().encode(data),
	);
	const assertion = `${data}.${base64UrlEncode(sig)}`;

	const r = await fetch(sa.token_uri || 'https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
			assertion,
		}),
	});
	if (!r.ok) throw new Error(`Google token exchange failed: ${r.status} ${await r.text()}`);
	const json = (await r.json()) as { access_token: string; expires_in: number };
	cachedToken = {
		token: json.access_token,
		expiresAt: now + (json.expires_in || 3600),
	};
	return json.access_token;
}
