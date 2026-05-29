import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Loader2, Mic, MicOff, Keyboard, Volume2 } from 'lucide-react';
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
const MODE_KEY = 'kibay_chat_mode'; // 'text' | 'voice'
const POLL_INTERVAL_MS = 5000;
const HIDDEN_PATH_PREFIXES = ['/admin', '/dashboard', '/checkout/cardnet'];

// Web Speech API support (Tier 5 in-browser voice). Chrome/Edge/Safari + mobile Safari yes,
// Firefox no (we degrade to text). HTTPS required — http://localhost works in dev too.
function isVoiceSupported() {
  if (typeof window === 'undefined') return false;
  const hasSR = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  const hasTTS = 'speechSynthesis' in window;
  return hasSR && hasTTS;
}

// Map app locale → BCP-47 region tag for SpeechRecognition / SpeechSynthesis.
// OS picks the closest available voice if the exact tag isn't installed.
const VOICE_LOCALE = { es: 'es-DO', en: 'en-US' };

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

  // Tier 5: in-browser voice mode (Web Speech API). State machine + refs.
  const voiceSupported = useMemo(isVoiceSupported, []);
  const [mode, setMode] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(MODE_KEY) || 'text' : 'text',
  );
  // voicePhase: idle | listening | thinking | speaking
  const [voicePhase, setVoicePhase] = useState('idle');
  const [voiceInterim, setVoiceInterim] = useState('');
  const recognitionRef = useRef(null);
  const lastSpokenIdRef = useRef(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  // ---- Voice mode (Tier 5) ---------------------------------------------
  // 1. Initialize SpeechRecognition once per mount + when locale changes.
  useEffect(() => {
    if (!voiceSupported) return undefined;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return undefined;
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.lang = VOICE_LOCALE[locale] || 'en-US';

    rec.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (interim) setVoiceInterim(interim);
      if (finalText.trim()) {
        setVoiceInterim('');
        setVoicePhase('thinking');
        // Send the transcript through the same path as a typed message.
        sendUserText(finalText.trim());
      }
    };
    rec.onerror = (e) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        // Permission denied — drop back to text mode.
        setMode('text');
        setError(t('voiceMicDenied', 'No pudimos acceder al micrófono. Cambiamos a chat de texto.'));
      }
      setVoicePhase('idle');
      setVoiceInterim('');
    };
    rec.onend = () => {
      setVoicePhase((p) => (p === 'listening' ? 'idle' : p));
    };
    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceSupported, locale]);

  // 2. TTS — speak the newest approved assistant message when in voice mode.
  useEffect(() => {
    if (mode !== 'voice' || !voiceSupported) return;
    const last = [...messages].reverse().find((m) => m.role === 'assistant' && !m.pending);
    if (!last || last.id === lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = last.id;
    try {
      window.speechSynthesis.cancel();
      const u = new window.SpeechSynthesisUtterance(last.body);
      u.lang = VOICE_LOCALE[locale] || 'en-US';
      // Pick a voice that matches the locale prefix if available.
      const voices = window.speechSynthesis.getVoices();
      const pref = (VOICE_LOCALE[locale] || 'en-US').slice(0, 2);
      const match = voices.find((v) => v.lang?.toLowerCase().startsWith(pref));
      if (match) u.voice = match;
      u.onstart = () => setVoicePhase('speaking');
      u.onend = () => setVoicePhase('idle');
      u.onerror = () => setVoicePhase('idle');
      window.speechSynthesis.speak(u);
    } catch {
      /* TTS unavailable — skip silently */
    }
  }, [messages, mode, voiceSupported, locale]);

  // 3. Stop in-flight SR/TTS when widget closes or mode flips away.
  useEffect(() => {
    if (open && mode === 'voice') return;
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    try { recognitionRef.current?.stop(); } catch { /* ignore */ }
    setVoicePhase('idle');
    setVoiceInterim('');
  }, [open, mode]);

  const handleVoiceTap = () => {
    if (!voiceSupported) return;
    if (voicePhase === 'speaking') {
      // Tap interrupts TTS.
      try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
      setVoicePhase('idle');
      return;
    }
    if (voicePhase === 'listening') {
      try { recognitionRef.current?.stop(); } catch { /* ignore */ }
      setVoicePhase('idle');
      return;
    }
    if (voicePhase === 'thinking') return;
    try {
      setVoiceInterim('');
      recognitionRef.current?.start();
      setVoicePhase('listening');
    } catch (e) {
      // Some browsers throw if .start() called twice quickly.
      setVoicePhase('idle');
    }
  };

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

  const sendUserText = useCallback(async (text) => {
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
        if (mode === 'voice') setVoicePhase('idle');
        return;
      }
      if (data.conversation_id && data.conversation_id !== conversationId) {
        setConversationId(data.conversation_id);
        localStorage.setItem(CONV_KEY, data.conversation_id);
      }
      if (data.reply?.body) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticPendingId
              ? { id: data.reply.id, role: 'assistant', body: data.reply.body }
              : m,
          ),
        );
      }
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticPendingId));
      setError(e.message || t('errorGeneric', 'Algo salió mal. Intenta de nuevo.'));
      if (mode === 'voice') setVoicePhase('idle');
    } finally {
      setSending(false);
    }
  }, [sending, conversationId, sessionToken, locale, location.pathname, t, mode]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendUserText(text);
  }, [input, sendUserText]);

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
            <div className="min-w-0">
              <p className="text-sm font-normal text-foreground">{t('title', 'Chatea con Kibay')}</p>
              <p className="text-[11px] text-foreground/55 font-light">
                {t('subtitle', 'Asistente AI de Kibay')}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {voiceSupported && (
                <div className="flex items-center bg-foreground/5 rounded-full p-0.5" role="group" aria-label={t('modeToggle', 'Modo')}>
                  <button
                    type="button"
                    onClick={() => setMode('text')}
                    aria-pressed={mode === 'text'}
                    aria-label={t('modeText', 'Modo texto')}
                    className={`px-2 py-1 rounded-full transition-colors ${mode === 'text' ? 'bg-[#D4A574] text-stone-950' : 'text-foreground/55 hover:text-foreground'}`}
                  >
                    <Keyboard className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('voice')}
                    aria-pressed={mode === 'voice'}
                    aria-label={t('modeVoice', 'Modo voz')}
                    className={`px-2 py-1 rounded-full transition-colors ${mode === 'voice' ? 'bg-[#D4A574] text-stone-950' : 'text-foreground/55 hover:text-foreground'}`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <button
                type="button"
                aria-label={t('close', 'Cerrar chat')}
                onClick={() => setOpen(false)}
                className="text-foreground/60 hover:text-foreground p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
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
                      {t('awaitingReview', 'Pensando…')}
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
            {mode === 'voice' && voiceSupported ? (
              <div className="flex flex-col items-center gap-2 py-2">
                {voiceInterim && (
                  <div role="status" className="text-xs text-foreground/55 font-light text-center w-full px-2 truncate">
                    "{voiceInterim}"
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleVoiceTap}
                  disabled={voicePhase === 'thinking'}
                  aria-label={
                    voicePhase === 'listening'
                      ? t('voiceStop', 'Tocar para detener')
                      : voicePhase === 'speaking'
                        ? t('voiceInterrupt', 'Tocar para interrumpir')
                        : t('voiceStart', 'Tocar para hablar')
                  }
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all disabled:cursor-not-allowed ${
                    voicePhase === 'listening'
                      ? 'bg-red-500/85 text-white ring-4 ring-red-500/30 animate-pulse'
                      : voicePhase === 'thinking'
                        ? 'bg-foreground/15 text-foreground/55'
                        : voicePhase === 'speaking'
                          ? 'bg-emerald-500/85 text-white ring-4 ring-emerald-500/30'
                          : 'bg-[#D4A574] text-stone-950 hover:bg-[#c29462]'
                  }`}
                >
                  {voicePhase === 'thinking' ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : voicePhase === 'listening' ? (
                    <MicOff className="w-6 h-6" />
                  ) : voicePhase === 'speaking' ? (
                    <Volume2 className="w-6 h-6" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </button>
                <p className="text-[11px] text-foreground/55 font-light text-center">
                  {voicePhase === 'listening'
                    ? t('voiceListening', 'Escuchando… habla con claridad')
                    : voicePhase === 'thinking'
                      ? t('voiceThinking', 'Procesando tu mensaje…')
                      : voicePhase === 'speaking'
                        ? t('voiceSpeaking', 'Respondiendo… toca para interrumpir')
                        : t('voiceTapToTalk', 'Toca el micrófono para hablar')}
                </p>
              </div>
            ) : (
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
            )}
            <p className="text-[10px] text-foreground/35 text-center mt-2 font-light">
              {t('hitlNotice', 'Respuestas generadas por AI. Para asuntos delicados, escríbenos a info@kibay.com.do.')}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
