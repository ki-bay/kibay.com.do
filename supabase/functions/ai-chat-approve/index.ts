// ai-chat-approve — admin-side approval endpoint.
// =============================================================================
// Admin-only. The /admin/ai-inbox UI POSTs to this to approve/edit/reject a
// pending assistant draft. Setting approval_status='approved' (or 'edited')
// stamps sent_at=now() which makes the message visible to the buyer's next
// poll.
//
// Body:
//   { message_id, action: 'approve' | 'edit' | 'reject', edited_body?: string, reason?: string }
//
// Auth: Supabase JWT of a user with users.role = 'admin'. Validated in code
// (verify_jwt = false in config.toml so we can read the bearer ourselves).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey, x-client-info',
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...cors, 'Content-Type': 'application/json' },
	});
}

type ApproveBody = {
	message_id?: string;
	action?: 'approve' | 'edit' | 'reject';
	edited_body?: string;
	reason?: string;
};

serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
	if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

	const authHeader = req.headers.get('authorization') || '';
	const jwt = authHeader.replace(/^Bearer\s+/i, '');
	if (!jwt) return json({ error: 'unauthorized' }, 401);

	const userClient = createClient(supabaseUrl, anonKey, {
		global: { headers: { Authorization: `Bearer ${jwt}` } },
	});
	const { data: userResult } = await userClient.auth.getUser();
	const userId = userResult?.user?.id;
	if (!userId) return json({ error: 'unauthorized' }, 401);

	const admin = createClient(supabaseUrl, serviceKey);
	const { data: userRow } = await admin
		.from('users')
		.select('id, role')
		.eq('id', userId)
		.maybeSingle();
	if (!userRow || userRow.role !== 'admin') {
		return json({ error: 'admin_only' }, 403);
	}

	let body: ApproveBody;
	try {
		body = (await req.json()) as ApproveBody;
	} catch {
		return json({ error: 'Invalid JSON' }, 400);
	}

	const messageId = body.message_id;
	const action = body.action;
	if (!messageId || !action) return json({ error: 'message_id and action required' }, 400);
	if (!['approve', 'edit', 'reject'].includes(action)) return json({ error: 'invalid action' }, 400);
	if (action === 'edit') {
		const editedBody = (body.edited_body || '').trim();
		if (!editedBody) return json({ error: 'edited_body required for edit' }, 400);
		if (editedBody.length > 4000) return json({ error: 'edited_body too long' }, 400);
	}

	// Fetch the message + its conversation + the conversation's channel
	// (so we can route outbound dispatch to the correct provider).
	const { data: msg } = await admin
		.from('ai_conversation_messages')
		.select('id, conversation_id, role, channel, body, approval_status, edited_body')
		.eq('id', messageId)
		.maybeSingle();
	if (!msg) return json({ error: 'message_not_found' }, 404);
	if (msg.role !== 'assistant') return json({ error: 'not_an_assistant_turn' }, 400);
	if (msg.approval_status !== 'pending') return json({ error: 'already_resolved', current_status: msg.approval_status }, 409);

	const now = new Date().toISOString();

	if (action === 'reject') {
		await admin
			.from('ai_conversation_messages')
			.update({
				approval_status: 'rejected',
				approved_by: userId,
				approved_at: now,
				// no sent_at — buyer never sees rejected drafts
			})
			.eq('id', messageId);
		await admin.from('ai_conversation_events').insert({
			conversation_id: msg.conversation_id,
			kind: 'rejected',
			payload: { reason: body.reason || null, message_id: messageId },
		});
		return json({ ok: true, status: 'rejected' });
	}

	const newStatus = action === 'edit' ? 'edited' : 'approved';
	await admin
		.from('ai_conversation_messages')
		.update({
			approval_status: newStatus,
			approved_by: userId,
			approved_at: now,
			sent_at: now,
			edited_body: action === 'edit' ? body.edited_body : null,
		})
		.eq('id', messageId);
	await admin.from('ai_conversation_events').insert({
		conversation_id: msg.conversation_id,
		kind: action === 'edit' ? 'edited' : 'approved',
		payload: { message_id: messageId, channel: msg.channel },
	});

	// Channel dispatch: web_chat is buyer-pull (poll endpoint), nothing to push.
	// email is push — fire ai-email-send. whatsapp / voice → future channels.
	let outboundDispatch: { ok: boolean; detail?: unknown } | null = null;
	if (msg.channel === 'email') {
		try {
			const dispatchResp = await fetch(`${supabaseUrl}/functions/v1/ai-email-send`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${jwt}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ message_id: messageId }),
			});
			const dispatchData = await dispatchResp.json().catch(() => ({}));
			outboundDispatch = { ok: dispatchResp.ok, detail: dispatchData };
			if (!dispatchResp.ok) {
				console.error('ai-chat-approve: outbound email dispatch failed', dispatchResp.status, dispatchData);
			}
		} catch (e) {
			console.error('ai-chat-approve: outbound email dispatch threw', e);
			outboundDispatch = { ok: false, detail: { error: String(e) } };
		}
	}

	return json({ ok: true, status: newStatus, sent_at: now, channel: msg.channel, outbound: outboundDispatch });
});
