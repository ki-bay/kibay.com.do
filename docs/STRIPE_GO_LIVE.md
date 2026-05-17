# Stripe go-live — exact 6 steps

The site is technically ready to accept real card payments. Right now it's
pointed at Stripe **test mode**, so every "purchase" is fake. Below is the
exact sequence to flip to **live mode**. Total time: ~10 minutes from your
side, ~5 minutes from mine.

---

## Step 1 — Activate your live account in Stripe (you, ~5 min)

Open https://dashboard.stripe.com/ → log in as the account that owns
Kibay (currently `babulashotsrd.setmore` per AGENTS.md).

In the top-right corner there's a **Test mode** toggle. If your account
hasn't been fully activated for live payments yet, clicking **Activate
account** will walk you through:

- Business details (legal name, address, tax ID)
- Bank account for payouts (account number + routing)
- Identity verification (passport / cédula photo)

Stripe usually approves within 24 hours for DR businesses. **You can't
proceed past step 2 until this is done.**

---

## Step 2 — Get the live keys (you, ~1 min)

Once activated:

1. Toggle **Test mode → Live mode** (top right).
2. Left sidebar → **Developers → API keys**.
3. Copy the **Publishable key** — starts with `pk_live_...`
4. Click **Reveal live key** on the **Secret key** — starts with `sk_live_...`. ⚠️ Show this only once; if you miss it click Roll key.

Send me these two values. I will:

- Set `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...` in Cloudflare Pages env (Production + Preview).
- Run `supabase secrets set STRIPE_SECRET_KEY=sk_live_...` from this machine.

---

## Step 3 — Register the live webhook (me, ~2 min)

Stripe needs to call our Supabase Edge Function when a payment succeeds
so we can mark the order paid, decrement inventory, and email the customer.

In Stripe Dashboard → **Developers → Webhooks → + Add endpoint**:

- **Endpoint URL:** `https://bsnxwajuqkatrmgoqcnu.supabase.co/functions/v1/stripe-webhook`
- **Description:** `Kibay production — order paid + refunded`
- **Events to listen for:**
  - `payment_intent.succeeded`
  - `charge.refunded`
- Click **Add endpoint**.
- The new endpoint will show a **Signing secret** (`whsec_...`). Reveal and copy.

Send me the signing secret. I'll run:

```
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

The webhook is now armed. Stripe will start delivering events the moment
the first live charge happens.

---

## Step 4 — Live test transaction (me, ~5 min)

Once keys + webhook are in:

1. I'll buy a Kibay product from the live site using a personal card,
   charging $1 or RD$50 (the lowest you can sell).
2. Confirm Stripe shows the charge, the order flips to `paid` in admin,
   the confirmation email arrives, the invoice PDF generates, and the
   admin notification email fires.
3. Refund the charge from the admin Orders page so we don't accidentally
   keep my $1.
4. Confirm refund landed, refund email arrived, and inventory was
   restored (or not — depends on how the trigger handles refunds; I'll
   verify).

If anything fails I fix it before we go any further.

---

## Step 5 — Tax setup (you + Stripe, ~30 min)

For DR businesses Stripe doesn't auto-calculate **ITBIS** (18%) — you
need to decide:

- **Option A:** Prices include ITBIS (most common for B2C wine). The
  product price IS the final price the customer sees, and the invoice
  shows ITBIS as a breakout line. Simpler.
- **Option B:** ITBIS added at checkout. Requires Stripe Tax setup or
  a manual line in our checkout code.

Tell me which you want and I'll wire it in. **Option A** is the default
for retail; **Option B** is more common for B2B/wholesale.

---

## Step 6 — Soft launch (you, an evening)

Before you announce the shop publicly:

1. Have 2-3 friends place real orders. Watch for any UX surprises.
2. Make sure each gets a confirmation email + delivery within your
   normal shipping SLA.
3. Verify the abandoned-cart email fires (have someone start checkout
   and walk away for 30 min).
4. Confirm Sentry has zero new errors after these test transactions.

Once that's clean → push the announcement to your existing newsletter
list + the 145 B2B contacts you have ready in the email campaign tool.

---

## What I'll monitor for you after go-live

Every Monday morning (manually, until I build a dashboard for it) I can
do a 5-minute health check:

- Stripe → all events delivered, no failures
- Supabase → no Edge Function errors in last 7 days
- Sentry → any new JS errors on production
- CF Analytics → traffic baseline (% mobile vs desktop, top pages)
- Orders table → any orders stuck in `awaiting_payment` > 1 hour
  (would indicate webhook delivery problem)
- Abandoned-cart sweep → recovery_email_sent_at counts

Anything anomalous I'll surface immediately. You won't need to babysit.
