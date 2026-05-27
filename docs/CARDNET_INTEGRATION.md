# CARDNET Botón de Pago (Webpantalla) Integration

How Kibay's CARDNET payment flow is wired, what's needed to go live, and the test path.

## One-paragraph version

Kibay uses CARDNET's **hosted-checkout product**: Botón de Pago Webpantalla. When a buyer clicks "Pagar con CARDNET" on the checkout page, we POST the order details to `/sessions` to mint a SESSION GUID, then the browser is auto-redirected via a tiny form-POST to `/authorize` carrying that SESSION. CARDNET serves their own card-entry page (with 3DS if the card supports it), the buyer enters card data there, and on result CARDNET redirects back to `/checkout/cardnet/return` (success/decline) or `/checkout/cardnet/cancel` (user gave up). Our return page calls `/sessions/<id>?sk=<key>` server-side to verify the final status and flips the order to `paid` or `payment_failed`. **Card data never touches our servers** → PCI scope is SAQ A.

## Components

| Layer | File | Responsibility |
|---|---|---|
| DB | [`20260517100000_cardnet_columns.sql`](../supabase/migrations/20260517100000_cardnet_columns.sql) | Adds `payment_method`, `cardnet_session_id`, `cardnet_authorization_code`, `cardnet_reference_number`, `cardnet_response_code`, `cardnet_response_message` |
| DB | [`20260527100000_cardnet_boton_de_pago.sql`](../supabase/migrations/20260527100000_cardnet_boton_de_pago.sql) | Drops obsolete ZTRANS columns; adds `cardnet_session_key`, `cardnet_tx_token` |
| Edge Function | [`cardnet-create-session`](../supabase/functions/cardnet-create-session/index.ts) | POSTs to `<SESSION_URL>/sessions` with order params + 3DS fields. Returns `{session, authorize_url}` to the SPA. |
| Edge Function | [`cardnet-verify-session`](../supabase/functions/cardnet-verify-session/index.ts) | GETs `<SESSION_URL>/sessions/<id>?sk=<key>`. Flips order to paid (response-code `00`) or payment_failed. Fires confirmation emails. |
| Frontend | [`CardnetRedirectButton`](../src/pages/CheckoutPage.jsx) inside [`CheckoutPage.jsx`](../src/pages/CheckoutPage.jsx) | Single "Pagar con CARDNET" button → calls create-session → auto-submits hidden form to authorize URL. |
| Frontend | [`CheckoutCardnetReturn.jsx`](../src/pages/CheckoutCardnetReturn.jsx) | Return landing — calls verify-session, shows pass/fail UI, navigates to `/checkout-success` on approval. |
| Frontend | [`CheckoutCardnetCancel.jsx`](../src/pages/CheckoutCardnetCancel.jsx) | Cancel landing — friendly "you can try again" page. |

## Edge Function secrets

| Secret | Sandbox value (currently set) | Prod value (post-certification) |
|---|---|---|
| `CARDNET_SESSION_URL` | `https://labservicios.cardnet.com.do/sessions` | `https://ecommerce.cardnet.com.do/sessions` |
| `CARDNET_AUTHORIZE_URL` | `https://labservicios.cardnet.com.do/authorize` | `https://ecommerce.cardnet.com.do/authorize` |
| `CARDNET_MERCHANT_NUMBER` | `349000000` (shared QA) | Kibay's prod MerchantNumber |
| `CARDNET_MERCHANT_TERMINAL` | `58585858` (shared QA) | Kibay's prod TerminalId |
| `CARDNET_MERCHANT_TYPE` | `7997` (QA generic MCC) | `5921` (wine/liquor) or whatever Hansel assigns |
| `CARDNET_MERCHANT_NAME` | `KIBAY SANTO DOMINGO         DN DO` | same (40 chars max, 22 name + 13 city + 3 state + 2 country) |
| `CARDNET_ACQUIRING_INSTITUTION_CODE` | `349` | `349` |
| `CARDNET_RETURN_URL` | `https://kibay.com.do/checkout/cardnet/return` | same |
| `CARDNET_CANCEL_URL` | `https://kibay.com.do/checkout/cardnet/cancel` | same |
| `CARDNET_TRANSACTION_TYPE` | `200` | `200` (sale) |

`labservicios` and `ecommerce` are the only public hostnames per Hansel's clarification (`lab.cardnet.com.do` is documented in the PDF but dead — use `labservicios`).

## Request flow (in production / sandbox)

```
Buyer clicks "Pagar con CARDNET"
              │
              ▼
SPA → POST /functions/v1/cardnet-create-session
              │  body: {order_id, token (guest only)}
              ▼
Edge Function authenticates (owner JWT or guest_token)
loads order, builds payload (TransactionType, CurrencyCode, MerchantNumber,
MerchantTerminal, ReturnUrl, CancelUrl, Amount in 12-digit minor units,
+ 3DS_email, 3DS_mobilePhone, 3DS_workPhone, 3DS_homePhone,
+ 3DS_billAddr_line1/city/state/country/postCode — reused from shipping)
              │
              ▼
POST <SESSION_URL>/sessions     ← CARDNET responds with SESSION + session-key
              │
              ▼
Persist on order: cardnet_session_id + cardnet_session_key
Return to SPA: {session, authorize_url}
              │
              ▼
SPA renders hidden <form action={authorize_url} method="POST">
            <input name="SESSION" value={session}>
          </form>
SPA submits the form
              │
              ▼
Browser navigates to CARDNET hosted page (labservicios.cardnet.com.do/auth?s=GUID)
              │
              ▼
Buyer enters PAN + CVV + exp on CARDNET's own UI
3DS challenge (if card supports it) — issuer OTP
              │
              ▼
CARDNET decides → redirects to ReturnUrl on success/decline
                            OR CancelUrl on user cancel
              │
              ▼
/checkout/cardnet/return loads → POSTs /functions/v1/cardnet-verify-session
                                  with the order_id (token for guest)
              │
              ▼
Edge Function GETs <SESSION_URL>/sessions/<id>?sk=<key>
Response → ResponseCode='00' approved | other = declined
              │
              ▼
Order flipped to status='paid' or 'payment_failed'
Inventory-decrement trigger fires on paid transition
Confirmation + admin emails sent
              │
              ▼
SPA navigates to /checkout-success
```

## Auth model

- **Anon buyers** (guest checkout): the `order_id` is verified against `guest_lookup_token` passed in the function body. Token was generated server-side at order creation. The buyer's browser never holds the `cardnet_session_key` — that stays on the order row, only the Edge Function reads it.
- **Logged-in buyers**: same path, but the function also accepts the Supabase JWT as Bearer and matches `orders.user_id = auth.uid()`.
- Both Edge Functions have `verify_jwt = false` in [`supabase/config.toml`](../supabase/config.toml) because the platform-level JWT verifier rejects Supabase's newer `sb_publishable_*` anon key format that the SPA sends. In-function checks cover security.

## Path to live

| # | Step | Owner | Status |
|---|---|---|---|
| 1 | Sandbox code + E2E proof | Me | ✅ done |
| 2 | Schedule certification with Hansel Aybar / Integraciones CARDNET | Send the email in `docs/CARDNET_CERT_EMAIL.md` | ⏳ pending |
| 3 | Run CARDNET's certification test scenarios (approval, decline, 3DS challenge OK / NOK, void, refund, session timeout) | Hansel monitors, I drive | 1–3 business days |
| 4 | Receive production credentials (MerchantNumber, MerchantTerminal, prod URLs) | Hansel issues post-cert | Same day after cert |
| 5 | Submit `https://kibay.com.do` as the integration URL to the commercial exec for whitelist | You email | Same day |
| 6 | Update Supabase secrets to prod values | Me, ~5 min | Trivial |
| 7 | Set `VITE_CARDNET_ENABLED=true` on Cloudflare Pages (Production + Preview) | You via dashboard or me via wrangler | ~5 min |
| 8 | Smoke test with RD$50 on a real card | Both | 5 min |

## Stripe as history (already wired)

When `VITE_CARDNET_ENABLED=true` flips on:
- `CheckoutPage.jsx` takes the CARDNET branch (line ~37: `cardnetEnabled = import.meta.env.VITE_CARDNET_ENABLED === 'true'`). Stripe `PaymentElement` is never instantiated.
- Stripe webhook (`stripe-webhook`) stays deployed — still processes any legacy `payment_intent.succeeded` from old orders.
- Stripe refund function (`refund-payment`) stays callable for legacy orders.
- AdminOrdersPage shows `payment_method` per row → Stripe orders say `Stripe`, new CARDNET orders say `cardnet`.

Rollback is one env-var flip + redeploy.

## E2E test (current, with sandbox creds)

What's proven via Playwright (latest run with current code):
1. Order created → `cardnet-create-session` invoked
2. CARDNET returned a SESSION + session-key (200 OK)
3. Browser auto-submitted form to `labservicios.cardnet.com.do/authorize`
4. Browser landed on CARDNET hosted page (`labservicios.cardnet.com.do/auth?s=<GUID>`) with our DOP total, ITBIS calculated, customer email + phone pre-filled, Visa Secure / MC ID Check / SafeKey logos
5. Card form is fillable with QA Visa `4761340000000050` exp `11/29` CVV `123`

What's NOT proven in headless (because it requires a human-completed 3DS OTP challenge): the post-Pagar leg back to our `ReturnUrl` and the verify-session call. **This is exactly what CARDNET's certification process exercises.** Hansel walks through OTP scenarios manually with us.

## Common response codes

| Code | Meaning |
|---|---|
| `00` | Approved (only code that flips order to `paid`) |
| `01`, `02`, `08` | Call your bank |
| `04`, `05` | Declined |
| `13` | Invalid amount |
| `14` | Invalid card number |
| `33`, `54` | Expired card |
| `51` | Insufficient funds |
| `57`, `58` | Transaction not allowed |
| `91` | Issuer unavailable |
| `94` | Duplicate transaction |
| `404` | Session not found / expired (>30 min) |
| `TF` | 3DS authentication failed |

Full table is on the CARDNET technical-spec PDF p. 11–12 + mirrored in [`cardnet-verify-session/index.ts`](../supabase/functions/cardnet-verify-session/index.ts) `humanizeResponseCode` helper.
