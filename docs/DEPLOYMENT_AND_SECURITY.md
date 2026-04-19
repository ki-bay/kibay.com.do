# Kibay.com.do — deployment checklist & security

Read this after pulling **`main`**. It summarizes **what the codebase already does** and **what you must configure** on Supabase, Stripe, and hosting. Nothing here replaces legal/compliance review for payments and alcohol sales.

---

## 1. What has been implemented (high level)

| Area | Done in repo |
|------|----------------|
| **Catalog** | Products from Hostinger **`VITE_ECOMMERCE_API_URL`** + **`VITE_ECOMMERCE_STORE_ID`** (`src/api/EcommerceApi.js`). |
| **Cart** | React context + **`localStorage`** (`kibay_cart`). Drawer + **`/cart`** → **`/checkout`**. |
| **Checkout** | Creates **`orders`** / **`order_items`** as **`awaiting_payment`**, shipping tiers (`src/lib/shipping.js`), then Stripe Payment Element via **`create-payment-intent`** with **`order_id`** (server verifies amount). |
| **Stripe webhook** | **`supabase/functions/stripe-webhook`** — **`payment_intent.succeeded`** → order **`paid`**, PDF to **`blog_media/invoices/<order_id>.pdf`**, **`invoice_pdf_path`** set. |
| **Customer UI** | Order modal + success page: **tracking**, **shipping method**, **invoice PDF link** when present (`src/lib/supabaseStorage.js`). |
| **Admin** | **`/admin/orders`** — list/update orders; **`/account`** sidebar links for admins; **`users.role`** + RLS migration. |
| **Horizons** | Production bundle does **not** inject Horizons iframe scripts unless **`VITE_HORIZONS_EMBED=1`**. Dev-only editor plugins stay off in production. |
| **Hosting** | **`vercel.json`** SPA rewrites; **`public/_redirects`** for Cloudflare Pages. |

---

## 2. Supabase — your tasks

1. **Link & migrate** (if not already):
   - `npx supabase login`
   - `npx supabase link --project-ref bsnxwajuqkatrmgoqcnu`
   - `npx supabase db push`  
   Ensure both **`20260419120000_kibay_initial_schema.sql`** and **`20260420120000_ecommerce_orders_admin.sql`** are applied on the **production** database.

2. **Edge Functions — deploy**:
   ```bash
   npx supabase functions deploy create-payment-intent
   npx supabase functions deploy stripe-webhook
   ```
   Other functions (`manage-api-keys`, etc.) as you use them.

3. **Edge secrets** (Dashboard → Edge Functions → Secrets):
   - **`STRIPE_SECRET_KEY`**
   - **`STRIPE_WEBHOOK_SECRET`** (Stripe webhook signing secret)
   - **`SUPABASE_SERVICE_ROLE_KEY`** (required for order-bound payment intent + webhook + storage upload)
   - **`SUPABASE_URL`** / **`SUPABASE_ANON_KEY`** — usually present on hosted projects; **`create-payment-intent`** uses the caller’s JWT + service role for order checks.

4. **Auth redirect URLs**  
   Authentication → URL configuration: add your **Vercel production** URL, **preview** URL pattern if you use previews, **local** `http://localhost:3000` (or your dev port).

5. **Admin user**  
   After **`info@kibay.com.do`** exists in **`auth.users`** (and thus **`public.users`** via trigger), run in SQL Editor if needed:
   ```sql
   UPDATE public.users SET role = 'admin'
   WHERE lower(coalesce(email,'')) = lower('info@kibay.com.do');
   ```

6. **Invoices in public storage**  
   PDFs live under **`blog_media/invoices/`** with **public read** (same as blog assets). Anyone with the URL can open the file. For stricter privacy later, move to a **private** bucket + **signed URLs** (code + policy change).

---

## 3. Stripe — your tasks

1. **Webhook endpoint** (Dashboard → Developers → Webhooks):  
   `https://bsnxwajuqkatrmgoqcnu.supabase.co/functions/v1/stripe-webhook`  
   - Event: **`payment_intent.succeeded`** (minimum).  
   - Copy **Signing secret** → Supabase secret **`STRIPE_WEBHOOK_SECRET`**.

2. **Test vs live**  
   Use **test** keys in Preview; **live** keys only in Production. Rotate keys if they were ever pasted into chat, tickets, or a repo.

---

## 4. Vercel (or Cloudflare Pages) — your tasks

### Vercel

- **Root**: SPA, **Build**: `npm run build`, **Output**: `dist`.
- **Environment variables** (Production + Preview as appropriate):
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy `VITE_SUPABASE_ANON_KEY`)
  - `VITE_STRIPE_PUBLISHABLE_KEY`
  - `VITE_ECOMMERCE_API_URL`
  - `VITE_ECOMMERCE_STORE_ID`
  - Optional: `VITE_MEDIA_CDN_BASE`
  - Optional explicit: `VITE_HORIZONS_EMBED=0`

### Cloudflare Pages

- **Deploy command**: empty.  
- **Build output**: **`dist`**.  
- Do **not** use **`npx wrangler deploy`** for this static app.

---

## 5. Security — actions for you (mandatory habits)

| Priority | Action |
|----------|--------|
| **Critical** | **Never** commit **`.env.local`**, Stripe **secret** keys, or **Supabase service_role** into git or client-side `VITE_*` variables. |
| **Critical** | If a password or secret was typed in **chat**, **email**, or a ticket → **rotate** it (Stripe, Supabase, store owner account). |
| **High** | Restrict **Supabase Dashboard** and **Stripe Dashboard** to staff; enable **2FA** on GitHub and Cloudflare/Vercel. |
| **High** | Review **RLS** when adding tables; avoid `USING (true)` on sensitive tables for **anon** role. |
| **Medium** | **CORS** on `create-payment-intent` is permissive (`*`) for simplicity; tighten to your origins if you add a custom domain list later. |
| **Medium** | **Blog / public buckets**: uploading user-generated content under **public** read means treat uploads as **public**; scan/moderate as needed. |
| **Low** | Run **`npm audit`** periodically; major upgrades are separate from feature work. |

---

## 6. “Plan complete” self-check

- [ ] Production DB migrations applied.  
- [ ] `create-payment-intent` + `stripe-webhook` deployed; secrets set.  
- [ ] Stripe webhook delivered successfully (Dashboard → Webhooks → recent deliveries).  
- [ ] Test checkout (small amount / test card) → order **`paid`**, invoice PDF appears in Storage.  
- [ ] Vercel (or Pages) env vars set; production URL in Supabase Auth redirects.  
- [ ] Admin can open **`/admin/orders`** and update tracking/status.  
- [ ] Customer sees invoice link on success page or order details after webhook.

---

## 7. Where to read more in-repo

- **`AGENTS.md`** — day-to-day project memory, remotes, shop overview.  
- **`.env.example`** — variable names (no real secrets).

For questions about a specific file, search the repo for the path mentioned in **`AGENTS.md`** (Shop section).
