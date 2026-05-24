# CARDNET ZTRANS 3DS Integration

How the live payment path is wired, what to test, and what's needed before going to production.

## Architecture (one-paragraph version)

This is a **direct integration** — Kibay's checkout collects the card data on its own site (PAN + CVV + expiry + holder name) and posts it to CARDNET's ZTRANS API. There is no hosted "Botón de Pago" redirect in the spec CARDNET sent us. The flow has 3 server round-trips: `/servicios/3ds/server/authentication` → (browser does 3DS challenge in an iframe) → `/servicios/3ds/server/status` → `/api/payment/transactions/sales`. Card data lives only in browser memory and the Edge Functions' in-flight memory — it is never logged, never persisted.

## Components

| Layer | File | Responsibility |
|---|---|---|
| DB | [`supabase/migrations/20260523120000_cardnet_3ds_columns.sql`](../supabase/migrations/20260523120000_cardnet_3ds_columns.sql) | Adds `cardnet_integrator_tx_id`, `cardnet_three_ds_server_trans_id`, `cardnet_eci`, `cardnet_pn_ref`, `cardnet_idempotency_key` columns to `orders`. |
| Edge Function | [`supabase/functions/cardnet-auth-3ds/index.ts`](../supabase/functions/cardnet-auth-3ds/index.ts) | Calls `/authentication`, persists `threeDSServerTransID`, returns frictionless approval or challenge URL. |
| Edge Function | [`supabase/functions/cardnet-finalize-sale/index.ts`](../supabase/functions/cardnet-finalize-sale/index.ts) | After 3DS, calls `/status` then `/sales`, marks order paid, fires confirmation emails. |
| Frontend | [`src/pages/CheckoutPage.jsx`](../src/pages/CheckoutPage.jsx) (`CardnetCardForm`) | Renders the card form + browser context capture + 3DS challenge modal. |
| Frontend | [`src/pages/CheckoutCardnetReturn.jsx`](../src/pages/CheckoutCardnetReturn.jsx) | The 3DS return URL — runs inside the iframe, postMessages parent on return. |

The old stubs (`create-cardnet-session`, `cardnet-verify`) are no longer called from the SPA. They still exist on Supabase as inactive functions and can be deleted once the new flow is locked in.

## Required Edge Function secrets

| Secret | Sandbox value | Prod value |
|---|---|---|
| `CARDNET_3DS_BASE_URL` | `https://lab.cardnet.com.do` | `https://servicios.cardnet.com.do` |
| `CARDNET_API_BASE_URL` | `https://lab.cardnet.com.do/api/payment` | `https://ecommerce.cardnet.com.do/api/payment` |
| `CARDNET_INTEGRATOR_CODE` | `349011300` | issued by account exec |
| `CARDNET_API_KEY` | `66827137-4ad5-4a37-8e87-6299fe2d5b57` | issued by account exec |
| `CARDNET_MERCHANT_ID` | `349041263` | issued by account exec |
| `CARDNET_TERMINAL_ID` | `77777777` | issued by account exec |
| `CARDNET_RETURN_URL` | `http://localhost:3000/checkout/cardnet/return` | `https://kibay.com.do/checkout/cardnet/return` |

Set via `npx supabase secrets set KEY=value KEY2=value2`.

## Required SPA env (Cloudflare Pages)

| Env | Effect |
|---|---|
| `VITE_CARDNET_ENABLED=true` | Flips checkout to the CARDNET DOP path. Without this it falls back to Stripe. |

## Sandbox status (2026-05-23) — BLOCKED waiting on CARDNET

Code-side: all correct. Verified the SHA-512 signing recipe matches the PDF's worked example byte-for-byte; the Edge Function signature implementation reproduces it. Payload field names match the Postman collection. CORS, JWT-verify, and dual-auth (logged-in JWT or guest token) all confirmed working via end-to-end Playwright drive.

Endpoint-side: the QA host documented in the PDF is dead.

| Host (per PDF) | Reachability | What happens |
|---|---|---|
| `lab.cardnet.com.do/servicios/3ds/server/authentication` | dead | 302 → `/error/503.html` |
| `labservicios.cardnet.com.do/servicios/3ds/server/authentication` | unhealthy | 502 nginx (3DS module not deployed; only the `/api/payment/*` sales side works here) |
| `servicios.cardnet.com.do/servicios/3ds/server/authentication` | live | Returns proper JSON, but rejects the PDF's QA `integratorCode=349011300` + `apiKey=66827137-...` with `MESSAGE_NOT_VALID: invalid signature for message`. This host expects production-grade creds. |

**Action needed from the CARDNET account exec (Sergio Objío):**

1. Confirm the current sandbox URL for `/servicios/3ds/server/authentication` — `lab.cardnet.com.do` returns 503 errors and the docs may be stale.
2. If sandbox is migrated, share the new host or confirm sandbox runs on `servicios.cardnet.com.do` with a different integratorCode/apiKey pair.
3. Alternatively, provision Kibay's **production** merchant creds (MERCHANT_ID, TERMINAL_ID, INTEGRATOR_CODE, API_KEY) so we can test against `servicios.cardnet.com.do` directly with a small real-money charge.

Until one of those arrives the integration cannot be exercised end-to-end. The code is shippable; only the test against a live endpoint is blocked.

## Once real creds arrive — local test

```bash
# Update secrets with real values, then:
npm run dev  # http://localhost:3000
```

1. Add a product to the cart, go to checkout.
2. Fill in shipping (any DR address). The payment step shows the DOP card form.
3. Use the test card CARDNET issues with the creds (or a real low-value card).
4. Submit → either frictionless (transStatus=Y) and you land on `/checkout-success`, or a 3DS challenge modal opens. OTP per CARDNET's test guide.
5. After the OTP, the modal closes and you land on `/checkout-success`.
6. Verify in Supabase: the order should be `status='paid'`, with `cardnet_authorization_code`, `cardnet_pn_ref`, `cardnet_eci` populated.

If something rejects: check the Edge Function logs at https://supabase.com/dashboard/project/bsnxwajuqkatrmgoqcnu/functions → `cardnet-auth-3ds` / `cardnet-finalize-sale` → Logs.

A working Playwright driver for the SPA flow is at [`cardnet-e2e.mjs`](../cardnet-e2e.mjs) — run with `node cardnet-e2e.mjs` while `npm run dev` is up. It snapshots each step to `/tmp/cardnet-e2e/` for diagnosis.

## Going to production (checklist)

1. **Get merchant creds from CARDNET account exec:** `MERCHANT_ID`, `TERMINAL_ID`, `INTEGRATOR_CODE`, `API_KEY`. (The sandbox `INTEGRATOR_CODE=349011300` is a shared dev value; prod will be unique to Kibay.)
2. **Update Edge Function secrets** to prod values (table above). Keep `CARDNET_RETURN_URL=https://kibay.com.do/checkout/cardnet/return`.
3. **Set `VITE_CARDNET_ENABLED=true` on Cloudflare Pages** (Production + Preview).
4. **Redeploy CF Pages** (`git push origin main` after a commit, or trigger via dashboard).
5. **Live smoke test** with a small RD$ amount on a real card — verify confirmation email arrives and Supabase row reflects `paid`.
6. **PCI compliance**: this flow puts Kibay in **SAQ A-EP scope** at minimum (we touch the PAN in transit even though we never persist it). Required mitigations:
   - All card-data routes are HTTPS only (CF/Supabase TLS 1.2+).
   - Edge Functions never log card data (verified — only `responseCode`/`internalResponseCode` go to console).
   - DB never stores card data (verified — only `cardnet_*` audit columns).
   - Quarterly ASV scans + annual self-assessment are merchant responsibilities. Talk to the acquirer.

## Refunds / voids

Not wired yet. The ZTRANS doc describes `POST /transactions/refund` (needs a bearer token from CARDNET) and `POST /transactions/voids` (no bearer). Both are post-MVP — add when the first refund request comes in. The `cardnet_pn_ref` column already captures the `pnRef` needed to call them.
