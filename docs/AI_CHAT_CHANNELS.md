# AI HITL chat — channel setup

The web chat (Tier 1) + in-browser voice mode (Tier 5) are **fully shipped** and need no further setup. The other tiers each require external provisioning that only you can do — instructions below.

## Tier 2 — Email channel

**Status: code is deployed; needs DNS + Email Routing dashboard config + Brevo from-domain DKIM before live emails route through it.**

Architecture recap:
- Cloudflare Email Worker `kibay-email-inbound` (deployed) catches inbound mail, parses RFC-5322 with postal-mime, HMAC-signs the payload, POSTs to Supabase Edge Function `ai-email-inbound`
- `ai-email-inbound` resolves/creates the conversation thread, drafts via Claude, saves as `approval_status='pending'`
- You approve in `/admin/ai-inbox` (same UI as web chat); `ai-chat-approve` detects `channel='email'` and triggers `ai-email-send`
- `ai-email-send` builds the threaded RFC-5322 reply, sends via Brevo's `/v3/smtp/email` endpoint, writes the outbound `email_messages` row

### What's deployed (no action needed)

| Component | Where | Status |
|---|---|---|
| `email_threads`, `email_messages` tables | Supabase migration `20260524110000_ai_chat_channels.sql` | ✅ applied |
| `ai-email-inbound` Edge Function | Supabase | ✅ deployed, `verify_jwt=false` |
| `ai-email-send` Edge Function | Supabase | ✅ deployed, `verify_jwt=false` |
| `ai-chat-approve` patched to dispatch on email approval | Supabase | ✅ deployed |
| Cloudflare Worker `kibay-email-inbound` | CF account | ✅ deployed at `kibay-email-inbound.sweet-math-09d2.workers.dev` |
| HMAC secret | both Supabase + Worker | ✅ shared |
| Brevo API key | Supabase | ✅ set (same key used for newsletter) |

### What you need to do (one-time, ~30 minutes)

1. **DNS — point `reply.kibay.com.do` MX records at Cloudflare Email Routing.**
   - Cloudflare dashboard → kibay.com.do → DNS → Records
   - Add MX records for `reply` (subdomain):
     - `reply.kibay.com.do` → MX `route1.mx.cloudflare.net` priority 10
     - `reply.kibay.com.do` → MX `route2.mx.cloudflare.net` priority 20
     - `reply.kibay.com.do` → MX `route3.mx.cloudflare.net` priority 30
   - Add TXT for SPF: `reply.kibay.com.do` → TXT `v=spf1 include:_spf.mx.cloudflare.net include:spf.brevo.com ~all`

2. **Enable Email Routing for the subdomain.**
   - Cloudflare dashboard → kibay.com.do → Email → Email Routing
   - Click "Enable Email Routing"
   - Add destination address: confirm `info@kibay.com.do` (for failsafe forwarding of anything the Worker rejects)

3. **Add the catch-all route → Worker.**
   - Email Routing → Routes → Add custom address
   - Custom address: `*@reply.kibay.com.do` (catch-all)
   - Action: "Send to a Worker" → pick `kibay-email-inbound`
   - Save

4. **Configure Brevo authorized sending domain (DKIM).**
   - Brevo dashboard → Senders & IP → Domains → Add domain
   - Domain: `reply.kibay.com.do`
   - Brevo will give you a DKIM TXT record. Add it to Cloudflare DNS.
   - Wait ~10 min, then click "Authenticate this domain" in Brevo.
   - Once green, outbound mail from `hola@reply.kibay.com.do` will be DKIM-signed and won't hit spam.

5. **Add the verified sender in Brevo.**
   - Brevo dashboard → Senders & IP → Senders → Add a sender
   - Name: Kibay, Email: `hola@reply.kibay.com.do`
   - Click verification link Brevo emails (this proves you own the mailbox).

6. **Test.**
   - Send an email from your personal address to `hola@reply.kibay.com.do`
   - Within ~30 seconds, check `/admin/ai-inbox` — a new pending draft should appear with `channel: email`
   - Approve it; check your inbox for the threaded reply

### Troubleshooting

- **No pending draft appears:** check Worker logs (`wrangler tail kibay-email-inbound`) for HMAC or POST errors
- **Approval doesn't send outbound:** check Supabase Edge Function logs for `ai-email-send`; most likely Brevo domain not yet authenticated
- **Reply lands in spam:** Brevo DKIM not done. Re-check step 4.

---

## Tier 3 — WhatsApp (BLOCKED on Meta provisioning)

**Status: schema is deployed; Edge Function code NOT written yet.** Writing it now is wasted effort — the actual integration shape depends on which BSP you pick, and you can't test anything until Meta approves your WABA.

### What's deployed

| Component | Status |
|---|---|
| `whatsapp_numbers`, `whatsapp_templates`, `whatsapp_messages` tables | ✅ applied |

### What you need to do (multi-week external dependencies)

1. **Pick a BSP (Business Solution Provider).** Recommended for DR:
   - **360dialog** — best margins, Meta-approved templates, good for DR/LATAM. ~$50/mo + per-message cost.
   - **Twilio for WhatsApp** — easier setup, higher per-message cost. Already integrated if you do Tier 4 voice.
   - **Meta Cloud API direct** — free up to 1000 conversations/mo, then per-conversation pricing. Most complex setup.

2. **Meta Business Verification.** This is the multi-week long pole. Submit at https://business.facebook.com/.

3. **WhatsApp Business Account (WABA).** Your chosen BSP walks you through. They'll certify the Kibay phone number.

4. **Pre-submit at least one Service template** (e.g. `service_reply` with body `{{1}}`). Approval takes 15min–48h. This is what you send when a customer hasn't messaged you in >24h.

5. **Add WhatsApp button to the site** (`wa.me/<your-WABA-number>?text=Hola%20Kibay`) so visitors initiate conversations — you can't cold-message them.

6. **Ping me to write the Edge Function** once you have:
   - BSP API credentials
   - Verified phone number
   - At least one approved template

The schema + funnel is ready. The function (`ai-whatsapp-inbound` + outbound dispatcher) is ~200 LOC of provider-specific webhook handling.

---

## Tier 4 — Voice phone (BLOCKED on Twilio provisioning + monthly costs)

**Status: schema is deployed; Edge Function code NOT written yet.** Same reasoning as Tier 3 — pointless to write before the Twilio side exists.

### What's deployed

| Component | Status |
|---|---|
| `agent_phone_numbers`, `voice_calls` tables | ✅ applied |

### What you need to do

1. **Twilio account** (https://twilio.com). Free $15 trial credit; production needs a paid plan ($1/mo phone number + per-minute charges).
2. **Request ConversationRelay access.** Twilio gates it; ~48h approval.
3. **Buy a Dominican Republic local number** ($1/mo) or US toll-free ($2/mo).
4. **Decide on consent recording.** DR law requires explicit consent disclosure before recording. The TwiML greeting needs to announce it.
5. **Ping me to write the Edge Function** (TwiML endpoint + WebSocket bridge) once you have the Twilio account + number.

Voice cost runs ~$0.10–$0.20 per minute (Twilio + Anthropic + STT + TTS combined). Budget per-agent and enforce a cap.

---

## What's in production right now (you can use today)

- **Tier 1 web chat HITL** — every page has the chat widget. Anon visitors message; you approve in `/admin/ai-inbox`; they see the reply on the next poll.
- **Tier 5 in-browser voice** — same widget, but the visitor can tap a Voice toggle and talk instead of type. Uses the browser-native Web Speech API; works on Chrome / Edge / Safari (desktop + mobile), falls back to text on Firefox.

Both routes flow through the same `ai-chat` + `ai-chat-approve` + polling pipeline, so the operator UX is identical — every reply is HITL-gated regardless of how the visitor sent it.
