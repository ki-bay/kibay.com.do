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
- **Schema:** `supabase/migrations/20260419120000_kibay_initial_schema.sql` creates tables, RLS, storage buckets (`blog_images`, `blog_media`), and an **`auth.users` → `public.users`** sync trigger. **If the database already has objects with the same names,** review or edit the migration before applying (intended for a new project or empty `public` schema).
- Apply with:
  1. `npx supabase login`
  2. `npx supabase link --project-ref bsnxwajuqkatrmgoqcnu`
  3. `npx supabase db push` (or paste the SQL in Dashboard → SQL Editor on a fresh project).
- **Edge Functions** (in `supabase/functions/`): deploy with `npx supabase functions deploy create-payment-intent` (and others as needed). Set **secrets** in Dashboard: `STRIPE_SECRET_KEY` for payment intent; `SUPABASE_SERVICE_ROLE_KEY` for `manage-api-keys`.
- **Auth:** add your **Vercel** production and preview URLs under Authentication → URL configuration (Site URL + Redirect URLs).

## Deploy (Vercel)

- Build: `npm run build` (outputs **`dist/`**).
- **`vercel.json`** exists for SPA rewrites (client-side routes).
- Local dev: `npm run dev` (script uses `vite --host :: --port 3000`). If `uv_interface_addresses` / network errors appear, use `npx vite --host 127.0.0.1 --port 3000`.

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

## Misc notes

- **`npm install`** has been run; `npm audit fix` was run (some advisories remain without `--force` / major upgrades).
- **`node_modules`**, **`dist`**, **`.env*`** are gitignored (see **`.gitignore`**).
- **Marketing images:** `src/config/mediaCdn.js` + `VITE_MEDIA_CDN_BASE` (optional). **`public/favicon.png`** and **`public/og-default.jpg`** are used from `index.html` so OG/favicon work without the Horizons CDN.
- **Stripe:** `VITE_STRIPE_PUBLISHABLE_KEY` in env; checkout calls Edge Function `create-payment-intent` (needs `STRIPE_SECRET_KEY` on the function).
- **Horizons:** Vite only injects Horizons iframe helper scripts in **dev** (or if `VITE_HORIZONS_EMBED=1`).
