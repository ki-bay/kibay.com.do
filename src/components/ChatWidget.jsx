import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

// AI HITL Chat Widget — floating button bottom-right that opens a slide-out
// panel. The buyer types; we POST /functions/v1/ai-chat which drafts a reply
// via Claude and stores it as approval_status='pending'. The buyer sees an
// "awaiting reply" indicator until an admin approves the draft from
// /admin/ai-inbox; the widget then polls /functions/v1/ai-chat-poll every
// few seconds to pick up approved messages.
//
// Identity: anon. We persist a random session_token in localStorage and
// reuse it across page loads to thread the buyer's conversation history.

const SESSION_KEY = 'kibay_chat_session';
const CONV_KEY = 'kibay_chat_conv_id';
const POLL_INTERVAL_MS = 5000;
const HIDDEN_PATH_PREFIXES = ['/admin', '/dashboard', '/checkout/cardnet'];

function getOrCreateSessionToken() {
  if (typeof window === 'undefined') return '';
  let t = localStorage.getItem(SESSION_KEY);
  if (!t || !/^[a-zA-Z0-9_-]{16,128}$/.test(t)) {
    // 22-char base64url-ish token from crypto.randomUUID.
    t = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, '').slice(0, 32);
    localStorage.setItem(SESSION_KEY, t);
  }
  return t;
}

// Tiny markdown handler — supports [label](url) links + line breaks only.
// Bold-wrapped URLs are intentionally NOT handled (see skill gotcha #1) —
// the prompt instructs the AI never to bold-wrap, but if it slips we just
// render the raw text rather than breaking the URL.
function renderMessageBody(body) {
  const lines = (body || '').split('\n');
  return lines.map((line, lineIdx) => {
    const parts = [];
    const regex = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
    let cursor = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > cursor) parts.push(<span key={`${lineIdx}-${key++}`}>{line.slice(cursor, match.index)}</span>);
      parts.push(
        <a
          key={`${lineIdx}-${key++}`}
          href={match[2]}
          target={match[2].startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="underline text-[#D4A574] hover:text-[#c29462]"
        >
          {match[1]}
        </a>,
      );
      cursor = match.index + match[0].length;
    }
    if (cursor < line.length) parts.push(<span key={`${lineIdx}-${key++}`}>{line.slice(cursor)}</span>);
    return (
      <React.Fragment key={lineIdx}>
        {parts.length ? parts : line}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

const ChatWidget = () => {
  const { t, i18n } = useTranslation('chat');
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {id, role, body, pending?}
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const sessionToken = useMemo(() => getOrCreateSessionToken(), []);
  const [conversationId, setConversationId] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(CONV_KEY) : null,
  );
  const sinceCursorRef = useRef(null);
  const scrollerRef = useRef(null);

  // Determine current locale (es | en) from i18next.
  const locale = (i18n.language || 'es').slice(0, 2) === 'en' ? 'en' : 'es';

  // Hide on admin / dashboard / cardnet-return pages.
  const shouldHide = useMemo(
    () => HIDDEN_PATH_PREFIXES.some((p) => location.pathname.startsWith(p)),
    [location.pathname],
  );

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Poll for new approved messages while open + we have a conversation.
  useEffect(() => {
    if (!open || !conversationId) return undefined;
    let cancelled = false;

    async function pollOnce() {
      try {
        const url = new URL(`${supabase.supabaseUrl}/functions/v1/ai-chat-poll`);
        url.searchParams.set('conversation_id', conversationId);
        url.searchParams.set('session_token', sessionToken);
        if (sinceCursorRef.current) url.searchParams.set('since', sinceCursorRef.current);
        const resp = await fetch(url.toString());
        if (cancelled) return;
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) return;
        const fresh = data.messages || [];
        if (!fresh.length) return;
        setMessages((prev) => {
          // Drop the optimistic-pending placeholder if a real assistant message arrived.
          const next = prev.filter((m) => !(m.role === 'assistant' && m.pending));
          const seen = new Set(next.map((m) => m.id));
          for (const m of fresh) {
            if (!seen.has(m.id)) next.push({ id: m.id, role: m.role, body: m.body });
          }
          return next;
        });
        const last = fresh[fresh.length - 1];
        if (last) sinceCursorRef.current = last.created_at;
      } catch {
        /* swallow — next tick will retry */
      }
    }

    // Immediate fetch on open, then interval.
    pollOnce();
    const id = setInterval(pollOnce, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [open, conversationId, sessionToken]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);

    // Optimistic: render the user's message immediately, plus an
    // "awaiting reply" placeholder so the visitor sees acknowledgement.
    const optimisticUserId = `local-${Date.now()}`;
    const optimisticPendingId = `local-pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticUserId, role: 'user', body: text },
      { id: optimisticPendingId, role: 'assistant', body: '', pending: true },
    ]);
    setInput('');

    try {
      const resp = await fetch(`${supabase.supabaseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationId,
          session_token: sessionToken,
          message: text,
          locale,
          context_path: location.pathname,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticPendingId));
        setError(data.error || t('errorGeneric', 'Algo salió mal. Intenta de nuevo.'));
        return;
      }
      if (data.conversation_id && data.conversation_id !== conversationId) {
        setConversationId(data.conversation_id);
        localStorage.setItem(CONV_KEY, data.conversation_id);
      }
      // The draft is pending HITL approval; the placeholder bubble stays
      // visible until polling picks up the approved reply.
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticPendingId));
      setError(e.message || t('errorGeneric', 'Algo salió mal. Intenta de nuevo.'));
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, sessionToken, locale, location.pathname, t]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (shouldHide) return null;

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        aria-label={t('openChat', 'Abrir chat con Kibay')}
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-[#D4A574] text-stone-950 shadow-lg hover:bg-[#c29462] flex items-center justify-center transition-transform ${
          open ? 'scale-0 pointer-events-none' : 'scale-100'
        }`}
      >
        <MessageCircle className="w-6 h-6" strokeWidth={2} />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-2rem))] bg-card border border-foreground/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/10 bg-background/50">
            <div>
              <p className="text-sm font-normal text-foreground">{t('title', 'Chatea con Kibay')}</p>
              <p className="text-[11px] text-foreground/55 font-light">
                {t('subtitle', 'Cada respuesta es revisada por nuestro equipo')}
              </p>
            </div>
            <button
              type="button"
              aria-label={t('close', 'Cerrar chat')}
              onClick={() => setOpen(false)}
              className="text-foreground/60 hover:text-foreground p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            ref={scrollerRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-background/30"
          >
            {messages.length === 0 && (
              <div className="text-center text-foreground/55 text-sm font-light pt-8 px-4 leading-relaxed">
                {t(
                  'greeting',
                  'Hola 👋 Pregúntanos sobre Kibay — vinos, envíos, visitas al viñedo. Te respondemos cuanto antes.',
                )}
              </div>
            )}
            {messages.map((m) => {
              if (m.role === 'user') {
                return (
                  <div key={m.id} className="flex justify-end">
                    <div className="bg-[#D4A574] text-stone-950 px-3 py-2 rounded-2xl rounded-br-md text-sm font-light max-w-[80%] whitespace-pre-wrap break-words">
                      {m.body}
                    </div>
                  </div>
                );
              }
              if (m.pending) {
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="bg-foreground/5 border border-foreground/10 text-foreground/55 px-3 py-2 rounded-2xl rounded-bl-md text-xs font-light flex items-center gap-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      {t('awaitingReview', 'Tu mensaje fue recibido. Nuestro equipo lo revisará y te responderá pronto.')}
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.id} className="flex justify-start">
                  <div className="bg-foreground/8 text-foreground px-3 py-2 rounded-2xl rounded-bl-md text-sm font-light max-w-[85%] whitespace-pre-wrap break-words">
                    {renderMessageBody(m.body)}
                  </div>
                </div>
              );
            })}
            {error && (
              <div className="text-center text-red-400 text-xs font-light">{error}</div>
            )}
          </div>

          <div className="border-t border-foreground/10 p-3 bg-background/50">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={t('placeholder', 'Escribe tu mensaje…')}
                className="flex-1 resize-none bg-background border border-foreground/15 rounded-xl px-3 py-2 text-sm font-light text-foreground placeholder:text-foreground/40 focus:outline-none focus:border-[#D4A574] max-h-24"
                style={{ minHeight: 38 }}
                disabled={sending}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                aria-label={t('send', 'Enviar')}
                className="w-9 h-9 rounded-full bg-[#D4A574] text-stone-950 hover:bg-[#c29462] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-foreground/35 text-center mt-2 font-light">
              {t('hitlNotice', 'Las respuestas son revisadas por una persona antes de enviarse.')}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
