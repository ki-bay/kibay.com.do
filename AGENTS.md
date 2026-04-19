# Kibay.com.do — project memory (for humans + AI)

Keep this file updated when goals, infra, or workflows change. Future sessions use it as continuity.

## What this is

E‑commerce / brand site for **Kibay** (wines, espumante, cans, blog, checkout, admin). Built as a **Vite + React** SPA with **React Router**, **Tailwind**, **Supabase** (auth + data), **Stripe**, rich blog/admin tooling.

## Where it lived / where it’s going

- **Before:** **Hostinger Horizons** (Horizons-specific bits may still exist in `vite.config.js`; can be trimmed when no longer needed).
- **Target:** **Vercel** (frontend) + **Supabase** (backend as already used in code).
- **Repo:** `git@github.com:ki-bay/kibay.com.do.git` → remote name **`origin`**, default branch **`main`**.

## Supabase (active project)

- **Project ref:** `bsnxwajuqkatrmgoqcnu` → API URL `https://bsnxwajuqkatrmgoqcnu.supabase.co`.
- **Client keys:** use the **publishable** key (`sb_publishable_…`) in `VITE_*` / `NEXT_PUBLIC_*` only. Legacy **anon** JWT still works if set instead.
- **Secret** key (`sb_secret_…`): **never** put it in `VITE_` or `NEXT_PUBLIC_` env vars (it would ship to the browser). Use only on trusted servers (Edge Functions secrets, your API). Rotate it if it was ever pasted into chat, tickets, or client-side code.
- **App wiring:** `src/lib/customSupabaseClient.js` reads env only (no hardcoded keys). **`vite.config.js`** sets `envPrefix: ['VITE_', 'NEXT_PUBLIC_']` so either naming style works.

## Environment variables

- See **`.env.example`**. Typical local file: **`.env.local`** (gitignored).
- **Vite / browser:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`).
- **Same values, Next-style names** (optional, e.g. copy from Supabase dashboard): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- **Vercel:** add the same keys under Project → Settings → Environment Variables (Production + Preview). Builds fail fast if URL/key are missing.
- Never commit **`.env.local`** or real secrets.

## Supabase CLI (`supabase/` folder)

- **`npx supabase init`** has been run.
- **Schema:** `supabase/migrations/20260419120000_kibay_initial_schema.sql` creates tables, RLS, storage buckets (`blog_images`, `blog_media`), and an **`auth.users` → `public.users`** sync trigger (`handle_new_user` on `auth.users` INSERT). **If the database already has objects with the same names,** review or edit the migration before applying (intended for a new project or empty `public` schema).
- **E-commerce migration:** `supabase/migrations/20260420120000_ecommerce_orders_admin.sql` adds **`users.role`** (`customer` | `admin`), order columns **`stripe_payment_intent_id`**, **`tracking_number`**, **`tax_id`**, **`shipping_method`**, **`paid_at`**, **`invoice_pdf_path`**, **`subtotal_amount`**, **`shipping_amount`**, admin RLS policies on **`orders`** / **`order_items`**, and sets **`role = admin`** for **`info@kibay.com.do`** when that row exists.
- Apply with:
  1. `npx supabase login`
  2. `npx supabase link --project-ref bsnxwajuqkatrmgoqcnu`
  3. `npx supabase db push` (or paste the SQL in Dashboard → SQL Editor on a fresh project).
- **Edge Functions** (in `supabase/functions/`): deploy with  
  `npx supabase functions deploy create-payment-intent`  
  `npx supabase functions deploy stripe-webhook`  
  (and others as needed). **Secrets** (Dashboard → Edge Functions): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (webhook signing secret), `SUPABASE_SERVICE_ROLE_KEY`, plus default `SUPABASE_URL` / `SUPABASE_ANON_KEY` as provided by the platform.
- **Stripe webhook:** In Stripe Dashboard, add endpoint `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` (or your custom domain for functions), events **`payment_intent.succeeded`**. The function marks the order **`paid`**, sets **`paid_at`**, and uploads a simple PDF to **`blog_media/invoices/<order_id>.pdf`** (updates **`invoice_pdf_path`**).
- **Auth:** add your **Vercel** production and preview URLs under Authentication → URL configuration (Site URL + Redirect URLs).

## Deploy (Vercel)

- Build: `npm run build` (outputs **`dist/`**).
- **`vercel.json`** exists for SPA rewrites (client-side routes).
- Local dev: `npm run dev` (script uses `vite --host :: --port 3000`). If `uv_interface_addresses` / network errors appear, use `npx vite --host 127.0.0.1 --port 3000`.

## Deploy (Cloudflare Pages)

This repo is a **static Vite SPA** (`dist/`). Pages should **only** run the build and publish **`dist`** as the asset directory.

- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Deploy command:** leave **empty**. Do **not** set `npx wrangler deploy` — that command is for **Workers**; without a Worker-oriented setup, Wrangler tries to parse **`vite.config.js`** and fails. Pages uploads `dist` automatically after a successful build.
- SPA fallback: **`public/_redirects`** is copied into `dist` so deep links resolve to `index.html`.

## Git — two remotes (important)

| Remote   | URL |
|----------|-----|
| `origin` | `git@github.com:ki-bay/kibay.com.do.git` |
| `backup` | `git@github.com:ki-bay/kibay.com.do-backup.git` |

**User rule:** When they say **push to backup** / backup only → push **only** `backup` remote (e.g. `git push backup main`), **not** `origin`. When they say **push to main** / push without “backup” → **only** `git push origin main`, **not** `backup`. Only push both if they explicitly ask.

New clones must add the backup remote once:  
`git remote add backup git@github.com:ki-bay/kibay.com.do-backup.git`

## Cursor rules

- **`.cursor/rules/git-push-main-vs-backup.mdc`** — enforces the push behavior above (`alwaysApply: true`).
- **`.cursor/rules/read-project-agents.mdc`** — tells the agent to read this file and keep it current.

## Shop (Hostinger catalog + Supabase orders + Stripe)

- **Catalog / inventory:** `src/api/EcommerceApi.js` reads **`VITE_ECOMMERCE_API_URL`** and **`VITE_ECOMMERCE_STORE_ID`** (Hostinger E-commerce API). `getProducts`, `getProduct`, `getProductQuantities`, `getCategories` power **`/shop`**, **`/product/:id`**, and cart line items.
- **Product images:** `src/config/mediaCdn.js` — **`resolveProductMediaUrl()`** remaps Horizons CDN URLs when **`VITE_MEDIA_CDN_BASE`** is set; **`mediaUrl()`** serves marketing assets from **`/public`** in production when no CDN base is set.
- **Cart:** `src/hooks/useCart.jsx` — **React context** + **`localStorage`** key **`kibay_cart`**. Flyout cart and **`/cart`** both go to **`/checkout`** (Stripe Elements on-site flow; Hostinger **`initializeCheckout`** redirect is no longer used from the UI cart).
- **Checkout:** `src/pages/CheckoutPage.jsx` — creates **`orders`** + **`order_items`** with status **`awaiting_payment`**, then **`create-payment-intent`** with **`order_id`** (server verifies amount vs order using **service role**). Shipping tiers in **`src/lib/shipping.js`**. Optional **tax ID** stored on the order as **`tax_id`**.
- **Admin orders:** **`/admin/orders`** — list/update orders (tracking, shipping method label, status). Link from **`/dashboard/blog`**. Access: **`public.users.role = admin`** or legacy owner email check in **`ProtectedAdminRoute`**.
- **Invoices:** Stripe webhook uploads a PDF to **`blog_media/invoices/`**; customers can still use **Download Invoice** (jsPDF) from order details.

## Horizons legacy (audit)

| Location | Role |
|----------|------|
| `vite.config.js` | Injects Horizons postMessage scripts only when **`NODE_ENV !== 'production'`** or **`VITE_HORIZONS_EMBED === '1'`** — **not** in normal production builds. |
| `plugins/vite-plugin-iframe-route-restoration.js`, `plugins/visual-editor/*`, `plugins/selection-mode/*` | **Dev-only** plugins (not loaded in production build). |
| `src/utils/sanitizeHtmlContent.js` | Allows **`<iframe>`** for **YouTube** embeds in blog HTML — unrelated to Horizons. |
| `.env.example` | Documents **`VITE_HORIZONS_EMBED=0`** for explicit opt-out in preview builds. |

## Misc notes

- **`npm install`** has been run; `npm audit fix` was run (some advisories remain without `--force` / major upgrades).
- **`node_modules`**, **`dist`**, **`.env*`** are gitignored (see **`.gitignore`**).
- **Marketing images:** `src/config/mediaCdn.js` + `VITE_MEDIA_CDN_BASE` (optional). **`public/favicon.png`** and **`public/og-default.jpg`** are used from `index.html` so OG/favicon work without the Horizons CDN.
- **Stripe:** `VITE_STRIPE_PUBLISHABLE_KEY` in env; checkout calls Edge Function `create-payment-intent` (needs `STRIPE_SECRET_KEY` + `SUPABASE_SERVICE_ROLE_KEY` when using **`order_id`** validation).
- **Horizons:** Vite only injects Horizons iframe helper scripts in **dev** (or if `VITE_HORIZONS_EMBED=1`). Set **`VITE_HORIZONS_EMBED=0`** on Vercel for clarity.
