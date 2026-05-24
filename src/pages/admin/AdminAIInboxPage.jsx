import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Check, Pencil, X, AlertTriangle, MessageSquare, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// Admin AI inbox — list of pending AI drafts grouped by conversation, with
// approve / edit / reject controls. Approval flips approval_status and
// stamps sent_at so the buyer's next /ai-chat-poll sees the message.

const formatRelative = (iso) => {
	if (!iso) return '';
	const diff = Date.now() - new Date(iso).getTime();
	const m = Math.floor(diff / 60_000);
	if (m < 1) return 'now';
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.floor(h / 24);
	return `${d}d ago`;
};

const AdminAIInboxPage = () => {
	const [loading, setLoading] = useState(true);
	const [pending, setPending] = useState([]); // array of { conversation, pendingMessage, history }
	const [editingId, setEditingId] = useState(null);
	const [editDraft, setEditDraft] = useState('');
	const [acting, setActing] = useState({}); // { [messageId]: true }

	const fetchPending = useCallback(async () => {
		setLoading(true);
		try {
			// Pull all pending assistant drafts with their conversation.
			const { data: drafts, error } = await supabase
				.from('ai_conversation_messages')
				.select('id, conversation_id, body, confidence, intent, risk_flags, created_at')
				.eq('role', 'assistant')
				.eq('approval_status', 'pending')
				.order('created_at', { ascending: true })
				.limit(50);
			if (error) throw error;

			if (!drafts?.length) {
				setPending([]);
				return;
			}

			const conversationIds = [...new Set(drafts.map((d) => d.conversation_id))];
			const { data: convs } = await supabase
				.from('ai_conversations')
				.select('id, buyer_email, buyer_name, buyer_locale, context_product_id, context_path, first_message_at, last_message_at, status')
				.in('id', conversationIds);
			const convMap = new Map((convs ?? []).map((c) => [c.id, c]));

			// Pull recent history per conversation (last 10 messages each).
			const { data: history } = await supabase
				.from('ai_conversation_messages')
				.select('id, conversation_id, role, body, edited_body, approval_status, created_at')
				.in('conversation_id', conversationIds)
				.order('created_at', { ascending: true });
			const historyByConv = new Map();
			for (const m of history ?? []) {
				const arr = historyByConv.get(m.conversation_id) || [];
				arr.push(m);
				historyByConv.set(m.conversation_id, arr);
			}

			setPending(
				drafts.map((d) => ({
					pendingMessage: d,
					conversation: convMap.get(d.conversation_id),
					history: (historyByConv.get(d.conversation_id) || []).slice(-12),
				})),
			);
		} catch (e) {
			toast.error(`Could not load drafts: ${e.message}`);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchPending();
	}, [fetchPending]);

	const callApprove = useCallback(
		async (messageId, action, payload = {}) => {
			setActing((p) => ({ ...p, [messageId]: true }));
			try {
				const { data: { session } } = await supabase.auth.getSession();
				const accessToken = session?.access_token;
				const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/ai-chat-approve`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${accessToken || ''}`,
					},
					body: JSON.stringify({ message_id: messageId, action, ...payload }),
				});
				const data = await resp.json();
				if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
				toast.success(action === 'reject' ? 'Draft rejected' : action === 'edit' ? 'Edited & sent' : 'Approved & sent');
				setPending((prev) => prev.filter((p) => p.pendingMessage.id !== messageId));
				setEditingId(null);
				setEditDraft('');
			} catch (e) {
				toast.error(e.message);
			} finally {
				setActing((p) => {
					const next = { ...p };
					delete next[messageId];
					return next;
				});
			}
		},
		[],
	);

	const handleEditOpen = (msg) => {
		setEditingId(msg.id);
		setEditDraft(msg.body);
	};

	return (
		<>
			<Helmet>
				<title>AI Inbox — Kibay Admin</title>
				<meta name="robots" content="noindex,follow" />
			</Helmet>
			<Navigation />
			<main className="min-h-screen pt-32 pb-24 px-4 md:px-8">
				<div className="max-w-5xl mx-auto">
					<div className="flex items-center justify-between mb-8">
						<div>
							<h1 className="text-3xl font-light text-foreground flex items-center gap-3">
								<MessageSquare className="w-7 h-7 text-[#D4A574]" />
								AI Inbox
							</h1>
							<p className="text-sm text-foreground/55 font-light mt-1">
								Pending AI drafts. Approve, edit, or reject — buyers only see approved replies.
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							onClick={fetchPending}
							disabled={loading}
							className="border-foreground/20"
						>
							<RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
							Refresh
						</Button>
					</div>

					{loading && pending.length === 0 ? (
						<div className="flex items-center justify-center py-24 text-foreground/50">
							<Loader2 className="w-6 h-6 animate-spin mr-2" />
							Loading…
						</div>
					) : pending.length === 0 ? (
						<div className="text-center py-24 text-foreground/50 font-light">
							<MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
							<p>No pending drafts. The queue is clear.</p>
						</div>
					) : (
						<div className="space-y-6">
							{pending.map(({ pendingMessage, conversation, history }) => {
								const isActing = !!acting[pendingMessage.id];
								const isEditing = editingId === pendingMessage.id;
								const riskFlags = pendingMessage.risk_flags || [];
								return (
									<div
										key={pendingMessage.id}
										className="bg-card border border-foreground/15 rounded-2xl overflow-hidden"
									>
										{/* Header */}
										<div className="px-5 py-3 border-b border-foreground/10 bg-background/40 flex items-center justify-between gap-3 flex-wrap">
											<div className="flex items-center gap-3 text-xs text-foreground/60 font-light">
												<span className="text-foreground/80">
													{conversation?.buyer_email || conversation?.buyer_name || 'anon visitor'}
												</span>
												<span>·</span>
												<span>{conversation?.buyer_locale?.toUpperCase() || 'ES'}</span>
												{conversation?.context_path && (
													<>
														<span>·</span>
														<span className="truncate max-w-[200px]">from {conversation.context_path}</span>
													</>
												)}
												<span>·</span>
												<span>{formatRelative(pendingMessage.created_at)}</span>
											</div>
											<div className="flex items-center gap-2">
												{typeof pendingMessage.confidence === 'number' && (
													<span className="text-[10px] uppercase tracking-wider text-foreground/50">
														conf {Math.round(pendingMessage.confidence * 100)}%
													</span>
												)}
												{pendingMessage.intent && (
													<span className="text-[10px] uppercase tracking-wider text-foreground/50">
														{pendingMessage.intent}
													</span>
												)}
												{riskFlags.length > 0 && (
													<span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
														<AlertTriangle className="w-3 h-3" />
														{riskFlags.join(', ')}
													</span>
												)}
											</div>
										</div>

										{/* History preview */}
										<div className="px-5 py-4 space-y-3 bg-background/20">
											{history.slice(0, -1).map((m) => (
												<div key={m.id} className="text-sm font-light">
													<span className="text-foreground/45 mr-2">
														{m.role === 'user' ? '👤' : '🤖'}
													</span>
													<span className="text-foreground/75 whitespace-pre-wrap">
														{m.edited_body || m.body}
													</span>
												</div>
											))}
										</div>

										{/* The pending draft */}
										<div className="px-5 py-4 border-t border-foreground/10 bg-foreground/5">
											<div className="text-[11px] uppercase tracking-widest text-foreground/45 mb-2">
												AI Draft
											</div>
											{isEditing ? (
												<textarea
													value={editDraft}
													onChange={(e) => setEditDraft(e.target.value)}
													rows={6}
													className="w-full bg-background border border-foreground/20 rounded-lg p-3 text-sm font-light text-foreground focus:outline-none focus:border-[#D4A574]"
												/>
											) : (
												<p className="text-foreground text-sm font-light whitespace-pre-wrap">
													{pendingMessage.body}
												</p>
											)}
										</div>

										{/* Actions */}
										<div className="px-5 py-3 border-t border-foreground/10 flex items-center justify-end gap-2 flex-wrap">
											{isEditing ? (
												<>
													<Button
														type="button"
														variant="outline"
														onClick={() => {
															setEditingId(null);
															setEditDraft('');
														}}
														disabled={isActing}
														className="border-foreground/20"
													>
														Cancel
													</Button>
													<Button
														type="button"
														onClick={() => callApprove(pendingMessage.id, 'edit', { edited_body: editDraft.trim() })}
														disabled={isActing || !editDraft.trim()}
														className="bg-[#D4A574] hover:bg-[#c29462] text-stone-950"
													>
														{isActing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
														Save & send
													</Button>
												</>
											) : (
												<>
													<Button
														type="button"
														variant="outline"
														onClick={() => callApprove(pendingMessage.id, 'reject', { reason: 'rejected by operator' })}
														disabled={isActing}
														className="border-red-500/40 text-red-400 hover:bg-red-500/10"
													>
														<X className="w-4 h-4 mr-2" />
														Reject
													</Button>
													<Button
														type="button"
														variant="outline"
														onClick={() => handleEditOpen(pendingMessage)}
														disabled={isActing}
														className="border-foreground/20"
													>
														<Pencil className="w-4 h-4 mr-2" />
														Edit
													</Button>
													<Button
														type="button"
														onClick={() => callApprove(pendingMessage.id, 'approve')}
														disabled={isActing}
														className="bg-emerald-500 hover:bg-emerald-600 text-stone-950"
													>
														{isActing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
														Approve & send
														<ChevronRight className="w-4 h-4 ml-1" />
													</Button>
												</>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</main>
			<Footer />
		</>
	);
};

export default AdminAIInboxPage;
