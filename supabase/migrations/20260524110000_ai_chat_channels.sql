-- AI HITL chat — multi-channel schema additions.
--
-- Adds:
--   * `channel` column on ai_conversations + ai_conversation_messages so we
--     can distinguish web_chat / email / whatsapp / voice. Defaults to
--     web_chat to preserve existing rows.
--   * `email_threads` + `email_messages` for Tier 2 (email channel).
--   * `whatsapp_messages` for Tier 3 (placeholder schema — Tier 3 code lands
--     when Meta WABA verification is complete).
--   * `voice_calls` for Tier 4 (placeholder — Tier 4 code lands when Twilio
--     ConversationRelay + a paid number is provisioned).
--
-- The spine (ai_conversations + ai_conversation_messages) stays the source
-- of truth for the buyer↔Kibay thread regardless of which channel a turn
-- came in on. Side tables only hold channel-specific metadata.

ALTER TABLE public.ai_conversations
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'web_chat'
    CHECK (channel IN ('web_chat', 'email', 'whatsapp', 'voice'));

ALTER TABLE public.ai_conversation_messages
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'web_chat'
    CHECK (channel IN ('web_chat', 'email', 'whatsapp', 'voice'));

CREATE INDEX IF NOT EXISTS idx_ai_conv_msgs_channel
  ON public.ai_conversation_messages (channel, created_at);


-- ============================================================================
-- TIER 2 — Email channel
-- ============================================================================

CREATE TABLE public.email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,

  -- The ROOT message_id of the thread (RFC-5322 globally unique).
  -- Inbound worker matches In-Reply-To against any message_id IN this thread
  -- to find the existing conversation.
  root_message_id TEXT NOT NULL UNIQUE,

  -- Fallback threading when In-Reply-To is missing (mobile clients drop it).
  -- Match on normalized subject + buyer email pair instead.
  subject_normalized TEXT,
  buyer_email TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_threads_conv ON public.email_threads(conversation_id);
CREATE INDEX idx_email_threads_subj_email
  ON public.email_threads(subject_normalized, buyer_email)
  WHERE subject_normalized IS NOT NULL;

ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_threads_admin_select ON public.email_threads
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));
REVOKE INSERT, UPDATE, DELETE ON public.email_threads FROM anon, authenticated;


CREATE TABLE public.email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.email_threads(id) ON DELETE CASCADE,
  conversation_message_id UUID NOT NULL REFERENCES public.ai_conversation_messages(id) ON DELETE CASCADE,

  -- This email's RFC-5322 Message-ID. Globally unique → also serves as the
  -- idempotency key on inbound (dedup CF Email retries).
  message_id TEXT NOT NULL UNIQUE,
  in_reply_to TEXT,
  references_chain TEXT[],

  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  from_addr TEXT NOT NULL,
  to_addr TEXT[] NOT NULL,
  cc_addr TEXT[],
  subject TEXT,

  -- DKIM/SPF/DMARC verification results from the Worker. NULL on outbound.
  dkim_pass BOOLEAN,
  spf_pass BOOLEAN,
  dmarc_pass BOOLEAN,
  spam_score NUMERIC(4, 2),

  raw_headers JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_messages_thread ON public.email_messages(thread_id, created_at);
CREATE INDEX idx_email_messages_in_reply_to ON public.email_messages(in_reply_to)
  WHERE in_reply_to IS NOT NULL;

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY email_messages_admin_select ON public.email_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));
REVOKE INSERT, UPDATE, DELETE ON public.email_messages FROM anon, authenticated;


-- ============================================================================
-- TIER 3 — WhatsApp (schema only — Edge Function code lands post-Meta WABA approval)
-- ============================================================================
--
-- Real provisioning needed before this is usable:
--   1. Meta Business Verification (multi-week)
--   2. WhatsApp Business Account (WABA) — via 360dialog or Meta Cloud API direct
--   3. Per-number phone certification
--   4. At least one pre-approved template (start with 'service_reply' generic)
--
-- The schema is laid out now so when those land, only the Edge Function +
-- BSP webhook config are needed (no migration scramble during launch).

CREATE TABLE public.whatsapp_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT NOT NULL UNIQUE,         -- '+1809XXXXXXX'
  waba_id TEXT NOT NULL,                   -- Meta's WABA identifier
  display_name TEXT,
  verified_at TIMESTAMPTZ,
  bsp_provider TEXT NOT NULL CHECK (bsp_provider IN ('360dialog', 'twilio', 'meta_direct')),
  bsp_account_id TEXT,
  monthly_template_budget_cents INT DEFAULT 5000,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  language TEXT NOT NULL,                  -- BCP-47 ('es', 'en')
  category TEXT NOT NULL CHECK (category IN ('marketing', 'utility', 'authentication', 'service')),
  body_template TEXT NOT NULL,
  meta_template_id TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected', 'paused', 'disabled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (name, language)
);

CREATE TABLE public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_message_id UUID NOT NULL REFERENCES public.ai_conversation_messages(id) ON DELETE CASCADE,
  wa_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,

  -- Meta's globally-unique message id. Inbound idempotency key.
  wa_message_id TEXT NOT NULL UNIQUE,

  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  template_id UUID REFERENCES public.whatsapp_templates(id),
  -- Outbound only. Free-form vs template determines cost (templates cost
  -- per market; free-form is zero within the 24h service window).
  in_service_window BOOLEAN NOT NULL DEFAULT true,
  cost_cents INT NOT NULL DEFAULT 0,
  delivery_status TEXT NOT NULL DEFAULT 'sent'
    CHECK (delivery_status IN ('sent', 'delivered', 'read', 'failed')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_messages_wa_number ON public.whatsapp_messages(wa_number_id, created_at);

ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_numbers_admin_select ON public.whatsapp_numbers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY whatsapp_templates_admin_select ON public.whatsapp_templates
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY whatsapp_messages_admin_select ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_numbers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_templates FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.whatsapp_messages FROM anon, authenticated;


-- ============================================================================
-- TIER 4 — Voice phone (schema only — Edge Function lands post-Twilio approval)
-- ============================================================================
--
-- Real provisioning needed:
--   1. Twilio account + ConversationRelay access (~48h approval)
--   2. Per-agent Twilio phone number (~$1/mo + per-minute charges)
--   3. R2 bucket for call recordings (if consent-recording enabled)
--   4. WebSocket-capable bridge — Supabase Edge Functions support WS;
--      can also run via a Cloudflare Worker.

CREATE TABLE public.agent_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT NOT NULL UNIQUE,
  twilio_sid TEXT NOT NULL,
  monthly_minute_budget INT DEFAULT 500,
  forward_to_phone TEXT,                   -- warm-transfer destination (your mobile)
  voicemail_recording_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  agent_phone_id UUID NOT NULL REFERENCES public.agent_phone_numbers(id) ON DELETE CASCADE,
  twilio_call_sid TEXT NOT NULL UNIQUE,    -- idempotency key
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_phone TEXT,
  duration_seconds INT,
  recording_r2_key TEXT,
  recording_consent BOOLEAN NOT NULL DEFAULT true,
  warm_transfer_attempted BOOLEAN NOT NULL DEFAULT false,
  warm_transfer_succeeded BOOLEAN NOT NULL DEFAULT false,
  cost_cents INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_voice_calls_phone ON public.voice_calls(agent_phone_id, created_at);

ALTER TABLE public.agent_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_phone_admin_select ON public.agent_phone_numbers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));
CREATE POLICY voice_calls_admin_select ON public.voice_calls
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

REVOKE INSERT, UPDATE, DELETE ON public.agent_phone_numbers FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.voice_calls FROM anon, authenticated;


-- ============================================================================
-- Extend the events table to cover the new channels' funnel kinds.
-- ============================================================================

ALTER TABLE public.ai_conversation_events
  DROP CONSTRAINT IF EXISTS ai_conversation_events_kind_check;

ALTER TABLE public.ai_conversation_events
  ADD CONSTRAINT ai_conversation_events_kind_check
  CHECK (kind IN (
    'started', 'message_user', 'draft_pending', 'approved', 'edited',
    'rejected', 'lead_captured', 'escalated', 'abandoned',
    -- Channel-specific events:
    'email_sent', 'email_failed', 'wa_sent', 'wa_failed',
    'voice_call_started', 'voice_call_ended', 'voice_warm_transfer'
  ));
