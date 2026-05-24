-- AI HITL chat — schema for Tier 1 (web chat with human-in-the-loop approval).
--
-- Adapted from the ai-hitl-chat skill (originally built for AHO, a multi-tenant
-- real-estate SaaS). Kibay is single-tenant + single-agent, so the org_id /
-- agent_id / tier_at_creation columns are dropped.
--
-- Tables:
--   ai_conversations         — the cross-channel spine; one row per (buyer x context).
--   ai_conversation_messages — every turn (user/assistant) lives here. HITL gate
--                              is the approval_status column on assistant rows.
--   ai_generation_log        — per-LLM-call cost + token tracking; snapshot at
--                              call time so historical rollups survive pricing changes.
--   ai_conversation_events   — funnel checkpoints (started, draft_pending, approved,
--                              rejected, edited, lead_captured) for analytics.
--
-- Auth model:
--   Anon buyers identify themselves via buyer_session_token (random UUID in
--   localStorage). Edge Functions called from the chat widget validate the
--   token matches the conversation row before reading/writing.
--   Admin operations (approve/edit/reject) require users.role = 'admin'.

CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'escalated', 'resolved', 'abandoned')),

  -- Buyer identity (all nullable — progressive enrichment as buyer reveals info).
  buyer_session_token TEXT NOT NULL,  -- random UUID stored in browser localStorage
  buyer_email TEXT,
  buyer_name TEXT,
  buyer_locale TEXT NOT NULL DEFAULT 'es' CHECK (buyer_locale IN ('es', 'en')),

  -- Optional pin to a specific product the buyer is asking about.
  context_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  context_path TEXT,  -- the page they opened the chat from, e.g. '/product/kibay-sparkling'

  first_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_session_token ON public.ai_conversations(buyer_session_token);
CREATE INDEX idx_ai_conversations_status_last_msg ON public.ai_conversations(status, last_message_at DESC);
CREATE INDEX idx_ai_conversations_email ON public.ai_conversations(buyer_email)
  WHERE buyer_email IS NOT NULL;

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Admins (users.role = 'admin') can read every conversation.
CREATE POLICY ai_conversations_admin_select ON public.ai_conversations
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

-- Service-role bypasses; no anon/authenticated writes (Edge Functions handle).
REVOKE INSERT, UPDATE, DELETE ON public.ai_conversations FROM anon, authenticated;


CREATE TABLE public.ai_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,

  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),

  body TEXT NOT NULL,
  -- Operator can edit the AI draft before approving. If non-null, this is what
  -- the buyer sees instead of the raw `body`.
  edited_body TEXT,

  -- Classifier output (only set on assistant turns).
  confidence NUMERIC(3, 2),
  intent TEXT,
  risk_flags TEXT[] NOT NULL DEFAULT '{}',

  -- THE HITL GATE.
  --   pending  = AI drafted, awaiting operator review (buyer cannot see)
  --   approved = operator approved as-is
  --   edited   = operator edited then approved
  --   rejected = operator rejected; buyer never sees
  --   auto_sent = user turn OR future v2 auto-approval (currently only for role='user')
  approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'edited', 'rejected', 'auto_sent')),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  -- Buyer-discoverable IFF sent_at IS NOT NULL.
  sent_at TIMESTAMPTZ,

  ai_generation_log_id UUID,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conv_msgs_conv_created ON public.ai_conversation_messages(conversation_id, created_at);
CREATE INDEX idx_ai_conv_msgs_pending ON public.ai_conversation_messages(approval_status, created_at)
  WHERE approval_status = 'pending';
CREATE INDEX idx_ai_conv_msgs_sent_at ON public.ai_conversation_messages(conversation_id, sent_at)
  WHERE sent_at IS NOT NULL;

ALTER TABLE public.ai_conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_conv_msgs_admin_select ON public.ai_conversation_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

REVOKE INSERT, UPDATE, DELETE ON public.ai_conversation_messages FROM anon, authenticated;


CREATE TABLE public.ai_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  purpose TEXT NOT NULL,  -- 'chat_draft' | 'classifier' | 'translation' | ...
  model TEXT NOT NULL,    -- verbatim model ID, survives deprecation

  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  -- Snapshot at call time — historical rollups survive vendor price changes.
  estimated_cost_usd_cents INT NOT NULL DEFAULT 0,

  latency_ms INT NOT NULL DEFAULT 0,
  error_code TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_gen_log_day ON public.ai_generation_log(created_at DESC);
CREATE INDEX idx_ai_gen_log_model ON public.ai_generation_log(model, created_at DESC);

ALTER TABLE public.ai_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_gen_log_admin_select ON public.ai_generation_log
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

REVOKE INSERT, UPDATE, DELETE ON public.ai_generation_log FROM anon, authenticated;

-- Back-fill the FK on ai_conversation_messages now that ai_generation_log exists.
ALTER TABLE public.ai_conversation_messages
  ADD CONSTRAINT ai_conv_msgs_gen_log_fk
  FOREIGN KEY (ai_generation_log_id) REFERENCES public.ai_generation_log(id) ON DELETE SET NULL;


CREATE TABLE public.ai_conversation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,

  kind TEXT NOT NULL CHECK (kind IN (
    'started',          -- new conversation row created
    'message_user',     -- buyer sent a message
    'draft_pending',    -- LLM drafted; awaits approval
    'approved',         -- operator approved as-is
    'edited',           -- operator edited then approved
    'rejected',         -- operator rejected the draft
    'lead_captured',    -- buyer revealed email/phone
    'escalated',        -- conversation flagged for human follow-up
    'abandoned'         -- buyer left without resolution (analytics-only)
  )),

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conv_events_conv ON public.ai_conversation_events(conversation_id, created_at DESC);
CREATE INDEX idx_ai_conv_events_kind ON public.ai_conversation_events(kind, created_at DESC);

ALTER TABLE public.ai_conversation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_conv_events_admin_select ON public.ai_conversation_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'
  ));

REVOKE INSERT, UPDATE, DELETE ON public.ai_conversation_events FROM anon, authenticated;


-- Auto-update last_message_at on the parent conversation when a new message
-- is inserted. Saves the Edge Function from having to do a separate UPDATE.
CREATE OR REPLACE FUNCTION public.ai_conv_update_last_msg() RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ai_conversations
    SET last_message_at = NEW.created_at, updated_at = NOW()
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ai_conv_msgs_update_last_msg
  AFTER INSERT ON public.ai_conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.ai_conv_update_last_msg();
