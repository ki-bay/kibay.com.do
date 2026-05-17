# Path to Revenue — Kibay shop go-live plan

This is the operations plan for getting **real orders + real money** flowing
through kibay.com.do. The site is technically built; this document is what
remains to turn it into a working storefront that pays the bills.

Stakes: this is the owner's primary income source for his family. Every
blocker below costs real money.

---

## Where we are right now (2026-05-17)

| Capability | State |
|---|---|
| Catalog (wines + excursions) | ✅ Live, both languages, real photos |
| Cart + checkout UI | ✅ Live |
| Stripe payments | ⚠️ **Test mode only** (`pk_test_...`) — no real cards processed |
| CARDNET (DR local cards) | ❌ Not integrated — DR customers can't pay with local-only cards |
| Order confirmation emails (customer + admin) | ✅ Working (Edge Function + Brevo) |
| Invoice PDF download | ✅ Working (with new logo) |
| Abandoned-cart recovery | ✅ pg_cron every 15 min |
| Inventory auto-decrement on paid | ✅ Trigger fires on `status='paid'` |
| Tracking + shipping admin | ✅ Wired |
| Refunds | ✅ Admin button wired to Stripe |
| Reviews + ratings | ✅ Live on PDP |
| Coupons | ✅ Live |
| Blog auto-publish + cross-post (FB/IG/LI) | ✅ Every 3 days, hands-free |
| Newsletter + welcome flow | ✅ Live |
| B2B email campaigns | ✅ Live |
| Analytics (traffic, conversion funnel) | ❌ None |
| Error tracking | ❌ None |
| SEO baseline (sitemap, robots, schema) | ✅ Live |
| OG share images (FB/WA/LI link previews) | ⚠️ One generic, not bilingual |
| Lighthouse score | ⚠️ Not checked since logo+hero rebuild |

---

## The three blockers to first real order

In order of impact:

### 1. Stripe live mode

Right now every "purchase" produces a fake Stripe charge. Until Stripe is
flipped to live keys + a live webhook is registered, **no money moves**.

What you need to do (5 minutes in the Stripe dashboard):

1. https://dashboard.stripe.com/ → top-right toggle **Test mode → Live**.
2. Developers → **API keys** → reveal the live **publishable key** (`pk_live_...`) and **secret key** (`sk_live_...`).
3. Developers → **Webhooks** → **Add endpoint**:
   - URL: `https://bsnxwajuqkatrmgoqcnu.supabase.co/functions/v1/stripe-webhook`
   - Events: `payment_intent.succeeded`, `charge.refunded`
   - Copy the new **signing secret** (`whsec_...`).
4. Paste the three values here so I can swap them into:
   - Cloudflare Pages → `VITE_STRIPE_PUBLISHABLE_KEY`
   - Supabase Edge Function secret `STRIPE_SECRET_KEY`
   - Supabase Edge Function secret `STRIPE_WEBHOOK_SECRET`
5. I'll run a live $1 test charge from my card, refund it immediately, and
   confirm the full happy path before you take the site truly public.

### 2. CARDNET (Dominican local cards)

International cards work via Stripe, but a chunk of Dominican customers
will only have Visa/Mastercard on a **CARDNET-affiliated bank** (Banreservas,
BHD, Popular, Banco del Progreso, Scotiabank). Without CARDNET those
customers fail at checkout.

You said you already have an approved CARDNET merchant account. What I
need from your account exec or portal:

- `MerchantNumber` (production)
- `MerchantTerminal` (e-commerce terminal ID)
- `EncryptionKey` + `KeyId`
- The production endpoint base URL (typically `https://ecommerce.cardnet.com.do/api/payment`)

What I'll build (while waiting for those):

- Supabase Edge Function `create-cardnet-session` (signs the POST payload).
- Two return pages: `/checkout/cardnet/return`, `/checkout/cardnet/cancel`.
- A payment-method selector at `/checkout` so DR customers pick CARDNET, international ones pick Stripe.

### 3. Analytics + error tracking

You can't optimize what you can't see. Right now if a customer hits a JS
error during checkout, nobody knows. If 100 people visit on Tuesday from
an IG post, nobody knows.

What I'm wiring now (no external accounts needed; both have free tiers):

- **Cloudflare Web Analytics** — already free on your CF Pages dashboard,
  one click to enable. No cookies, no GDPR banner needed.
- **Sentry** — frontend error tracking. Free 5k events/month tier.

When errors happen on a real customer's checkout, you'll see them in Sentry.
When traffic spikes, you'll see it in CF Analytics.

---

## Sequenced milestones

### Phase 0 — Operational integrity (THIS WEEK)

The pre-launch shakedown. We can't go live with bugs in the order pipeline.

- [ ] End-to-end test order: cart → checkout → Stripe (test) → emails → invoice → admin
- [ ] Verify abandoned-cart email actually fires from the pg_cron (15-min interval)
- [ ] Wire up Sentry + CF Web Analytics
- [ ] Lighthouse pass on home + PDP + checkout (perf, a11y, SEO)
- [ ] CARDNET sandbox integration scaffold (ready to flip to live creds)
- [ ] **YOU**: provide Stripe live keys + CARDNET production creds

### Phase 1 — Go live (week of go-live)

- [ ] Swap Stripe to live mode, register live webhook
- [ ] $1 live test charge end-to-end (me + a personal card)
- [ ] CARDNET creds in place, $1 RD$50 test charge end-to-end
- [ ] Enable CF Web Analytics
- [ ] Send announcement email to existing newsletter list (welcome offer)
- [ ] Soft launch — share with friends/family first to catch any last bugs

### Phase 2 — Demand generation (first 4 weeks live)

The site is live; now we need traffic. This is largely your work but I can
build the infrastructure.

- [ ] Bilingual OG share images so links posted to FB/WA/LI render well
- [ ] Meta/Google ad-pixel install on confirmation page (track conversions)
- [ ] UTM auto-attribution on `orders` (which campaign drove which sale)
- [ ] Influencer/affiliate tracking codes
- [ ] Editorial calendar — the Drive→blog→social pipeline already runs every 3 days; we should pre-load 30 days of content to keep it humming
- [ ] First B2B campaign send to the 145+ DR alcohol-trade contacts you have

### Phase 3 — Conversion lifting (after first 50 orders)

Once data flows we can optimize. Until then we're guessing.

- [ ] A/B test PDP variations (hero crop, CTA copy, trust badges)
- [ ] Post-purchase review request (Brevo automation)
- [ ] Loyalty/referral system (one customer brings another, both get 10% off)
- [ ] PWA push notifications for new blog posts
- [ ] Email re-engagement: customers who didn't buy in 60 days

---

## Your weekly minimum (when the site is live)

Once orders start flowing, here's the operational rhythm:

- **Daily**: glance at admin orders page; ship anything `paid` but unshipped within 24h
- **Weekly**: review CF Analytics + Sentry; fix anything red
- **Monthly**: rotate Stripe API keys (security hygiene); pay CARDNET monthly fees

Most of this is 10-15 min/day.

---

## What I'll watch for as your shop ops lead

- **Failed payment intents** → I'll add an admin alert email
- **Abandoned cart fire rate** → if too low, the cron isn't running; if too high, the checkout has friction
- **Cross-post failures** → already alerting via results email after each /run
- **Stock-out warnings** → low-stock email already wired
- **Refund spikes** → would indicate a product/expectation issue

I'll surface anything anomalous in my updates — you shouldn't have to babysit dashboards.
