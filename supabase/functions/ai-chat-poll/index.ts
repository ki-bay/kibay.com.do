// ai-chat-poll — Tier 1 buyer-side polling endpoint.
// =============================================================================
// Anon-callable. The widget polls every ~5s to discover assistant messages
// the operator has approved since the last poll. Auth via session_token
// match on the conversation row.
//
// Returns:
//   { messages: [{ id, role, body, created_at, sent_at, status }] }
//   - role 'user' is included so a fresh widget can rehydrate the full
//     transcript on first call (the visitor's own messages).
//   - role 'assistant' included only when approval_status IN ('approved',
//     'edited', 'auto_sent') AND sent_at IS NOT NULL. The widget never
//     sees pending or rejected drafts.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...cors, 'Content-Type': 'application/json' },
	});
}

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'GET') return json({ error: 'GET only' }, 405);

	const url = new URL(req.url);
	const conversationId = url.searchParams.get('conversation_id');
	const sessionToken = url.searchParams.get('session_token');
	const since = url.searchParams.get('since'); // ISO timestamp cursor; optional

	if (!conversationId || !sessionToken) {
		return json({ error: 'conversation_id and session_token required' }, 400);
	}
	if (!/^[0-9a-f-]{36}$/i.test(conversationId)) return json({ error: 'invalid conversation_id' }, 400);
	if (!/^[a-zA-Z0-9_-]{16,128}$/.test(sessionToken)) return json({ error: 'invalid session_token' }, 400);

	const admin = createClient(supabaseUrl, serviceKey);

	// Verify the session token owns this conversation.
	const { data: conv } = await admin
		.from('ai_conversations')
		.select('id, buyer_session_token, status')
		.eq('id', conversationId)
		.maybeSingle();
	if (!conv || conv.buyer_session_token !== sessionToken) {
		return json({ error: 'not_found' }, 404);
	}

	let query = admin
		.from('ai_conversation_messages')
		.select('id, role, body, edited_body, approval_status, sent_at, created_at')
		.eq('conversation_id', conversationId)
		.order('created_at', { ascending: true })
		.limit(100);

	if (since) {
		query = query.gt('created_at', since);
	}

	const { data: messages, error } = await query;
	if (error) {
		console.error('ai-chat-poll: query failed', error);
		return json({ error: 'query_failed' }, 500);
	}

	// Filter: user messages always returned; assistant only when sent.
	const visible = (messages ?? []).filter((m) => {
		if (m.role === 'user') return true;
		if (m.role !== 'assistant') return false;
		return Boolean(m.sent_at) && ['approved', 'edited', 'auto_sent'].includes(m.approval_status);
	});

	return json({
		messages: visible.map((m) => ({
			id: m.id,
			role: m.role,
			body: m.edited_body || m.body,
			created_at: m.created_at,
			sent_at: m.sent_at,
		})),
		conversation_status: conv.status,
	});
});
