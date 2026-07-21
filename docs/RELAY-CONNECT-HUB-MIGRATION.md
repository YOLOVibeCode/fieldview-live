# FieldView → Noctusoft Relay "Square Connect Hub" Migration Plan

**Status:** Draft (2026-07-19). Plan only — no code yet. Go-live gated on attorney ToS/Recipient-Agreement review + first real coach.

## 1. Why

FieldView currently runs an **in-repo Square marketplace ("Model A")**: it stores each coach's Square OAuth tokens (encrypted) and charges the coach's Square account directly with `applicationFeeMoney`. That path has known defects (refunds hit the wrong Square account, prod stuck on sandbox, Square secrets committed to the repo, in-app webhook HMAC with a test backdoor).

The relay's new **Square Connect Hub** (`api.square.noctusoft.com/connect/fieldview/*`, shipped 2026-07-19) does the same marketplace pattern but **centrally**: the relay owns the coach OAuth tokens and every Square call; FieldView becomes a thin client that stores only a `recipientKey`. Money still lands ~90% in the coach's own Square and ~10% goes to the platform via `app_fee_money` (`app_fee_bps`, default 1000 = 10%, configurable). **FieldView never holds coach funds → no money-transmitter exposure.**

## 2. What the Connect Hub gives us (target endpoints)

All under `/connect/fieldview/*`, authed with the relay deploy key (`NOCTUSOFT_API_KEY`):

| Endpoint | Replaces in FieldView |
|---|---|
| `GET /oauth/authorize?recipient_key=…` → 302 to Square | `SquareService.generateConnectUrl` |
| `GET /oauth/callback` *(public)* — saves tokens | `SquareService.handleConnectCallback` + token storage |
| `POST /recipients/:key/agreement` | *(new — Recipient Agreement acceptance)* |
| `GET /recipients/:key/frontend-config` — `application_id` + env | the empty `NEXT_PUBLIC_SQUARE_*` + location mismatch |
| `POST /recipients/:key/charge` (`app_fee_money`) | `public.purchases.ts` `payments.create` |
| `POST /recipients/:key/refunds` (fee reversed pro-rata) | `RefundService` (broken central-client path) |
| `POST /recipients/:key/customers` + `/customers/:id/cards` | `SquareCustomerService` (card-on-file) |
| `POST /recipients/:key/plans` + `/subscriptions/*` | owner "pro" subscription (currently vaporware) |
| `POST /connect/webhooks/:env` *(public)* — HMAC + fanout | `webhooks.square.ts` HMAC handling |

Charge accepts `note`, `reference_id` (use `purchaseId`), `statement_description_identifier`, `buyer_email_address` (Square emails the receipt).

## 3. Current FieldView Square surface (what changes)

**API**
- `apps/api/src/routes/public.purchases.ts` — the real charge (`payments.create` + `applicationFeeMoney`) → **call relay `/charge`**
- `apps/api/src/routes/public.checkout.ts`, `services/PaymentService.ts` — checkout record stays; charge path re-pointed
- `apps/api/src/services/RefundService.ts` — **→ relay `/refunds`** (fixes broken path)
- `apps/api/src/routes/webhooks.square.ts` — **→ receive relay-forwarded events** (relay does HMAC)
- `apps/api/src/routes/owners.square.ts`, `services/SquareService.ts` — OAuth flow **→ redirect to relay `/oauth/authorize`**
- `apps/api/src/services/SquareCustomerService.ts` — card-on-file **→ relay customers/cards**
- `apps/api/src/routes/public.saved-payments.ts` — saved cards **→ relay**
- `apps/api/src/services/LedgerService.ts`, `owners.ledger.ts` — keep; source fee from relay charge response

**DELETE after migration**
- `apps/api/src/services/SquareOwnerClientService.ts` (per-owner token client — relay owns this)
- `SquareService` OAuth token exchange + `apps/api/src/lib/square.ts` central client (once refunds + webhooks are on the relay)
- Square secrets from all `.env*` (`SQUARE_ACCESS_TOKEN`, `SQUARE_APPLICATION_SECRET`, sandbox tokens, etc.)

**Web**
- `apps/web/components/checkout/SquareWalletPayment.tsx` — init Web SDK from relay `/frontend-config` (per-coach `application_id`/location) instead of `NEXT_PUBLIC_SQUARE_*` → **fixes the tokenize-location mismatch + Apple/Google Pay wallet issues**
- `apps/web/app/(public)/checkout/[purchaseId]/payment/page.tsx`, `components/PaywallModal.tsx` (+ delete stale `components/v2/paywall/PaywallModal.tsx` mock)
- `apps/web/app/owners/square/page.tsx` — "Connect Square" → relay authorize redirect
- `apps/web/app/owners/dashboard/page.tsx` — wire the (already-built) earnings/ledger view

## 4. Data model changes (`OwnerAccount`)

- **Add:** `relayRecipientKey String?`, `paymentsConnectedAt DateTime?`, `agreementAcceptedVersion String?`
- **Remove** (relay owns these now): `squareAccessTokenEncrypted`, `squareRefreshTokenEncrypted`, `squareTokenExpiresAt`, `squareLocationId`
- Keep `payoutProviderRef` (coach's Square merchant_id, for display only)
- `ViewerSquareCustomer.squareCustomerId` and `Purchase.squareCardId` stay (now on the coach's merchant, via relay)

## 5. Migration slices

- **Slice 0 — Provision & legal (prereq).** `provision-product.js --product fieldview`; put `NOCTUSOFT_API_KEY` + relay base URLs in Railway; register FieldView's webhook callback URL; set `app_fee_bps`. **Attorney:** finalize ToS + Recipient Agreement (served via `/recipients/:key/agreement`).
- **Slice 1 — Coach onboarding.** Schema `relayRecipientKey`; connect flow → relay OAuth; store key + agreement on callback; dashboard shows connect status.
- **Slice 2 — Viewer checkout.** Frontend-config from relay; tokenize with per-coach config; `processPayment` → relay `/charge`; mint entitlement (unchanged); ledger from relay response.
- **Slice 3 — Refunds + webhooks.** `RefundService` → relay `/refunds`; webhook endpoint consuming relay-forwarded events; reconcile purchase status/refunds.
- **Slice 4 — Card-on-file + subscriptions.** Saved cards via relay; owner "pro" subscription via relay subscription lifecycle.
- **Slice 5 — Cleanup.** Delete `SquareOwnerClientService`, `SquareService` OAuth, `lib/square.ts`, `OwnerAccount.square*` fields (data migration: existing connected coaches must **re-connect through the relay**); strip Square secrets from env.

## 6. Gaps this closes (from the earlier payment audit)

| Prior blocker | Resolved by |
|---|---|
| Prod stuck on Square sandbox | Relay env routing / product env |
| Refunds hit wrong Square account | Relay `/refunds` (per-recipient) |
| Square secrets committed to repo | Relay holds all tokens |
| Empty `NEXT_PUBLIC_SQUARE_*` / tokenize-location mismatch | Relay `/frontend-config` |
| Webhook HMAC + `x-test-mode` backdoor | Relay `/connect/webhooks/:env` |
| Owner "pro" subscription unimplemented | Relay subscription endpoints |

## 7. Open questions / prerequisites

1. **App-fee destination & accounting.** The 10% goes to "Noctusoft platform balance." Confirm how/whether that remits to FieldView's books (FieldView is a Noctusoft product — likely internal, but nail it down).
2. **`app_fee_bps` policy.** Set FieldView's default (10%?) and whether per-stream overrides are needed (promos/associations).
3. **External-coach OAuth is unproven.** Connect Hub Slice 1 was validated only on Noctusoft's *own* merchant. **Pilot with one real coach's Square** (via `test.squareup.noctusoft.com`) before broad rollout.
4. **Webhook auth from relay → FieldView** (shared secret / signature on the forwarded event).
5. **Existing connected coaches** must re-onboard through the relay (no token import path).
6. Zero-dollar/100%-off coupons, currency (USD-only today).

## 8. Verification (per slice)

Relay canary + `test.squareup.noctusoft.com` console (catalog, card-on-file, charge, refund, subscription, webhook fanout) + FieldView e2e against a sandbox recipient, before enabling a real coach.

## 9. Go-live env matrix (FieldView API — Railway)

| Env var | Purpose | Default |
|---|---|---|
| `NOCTUSOFT_API_KEY` | Relay deploy key (`nsins_dk_…`); Bearer auth to the relay | — (required) |
| `NOCTUSOFT_RELAY_SQUARE_BASE_URL` | Connect Hub base | `https://api.square.noctusoft.com` |
| `NOCTUSOFT_PRODUCT_KEY` | Connect Hub product slug | `fieldview` |
| `PAYMENTS_VIA_RELAY` | Route checkout/refunds through the relay | `false` (OFF) |
| `RELAY_AGREEMENT_VERSION` | Recipient Agreement version to record | `v1` |
| `FIELDVIEW_WEBHOOK_SECRET` | Verifies relay-forwarded webhooks (HMAC) | — (required for webhooks) |
| `FIELDVIEW_WEBHOOK_CALLBACK_URL` | Exact URL the relay signs against | `${API_BASE_URL}/api/webhooks/relay` |

On `ns` (relay): `connect_apps` for `fieldview` → `app_fee_bps=1000`, `agreement_version=v1`, `webhook_callback_url`, `post_connect_redirect=…/owners/dashboard?payments_connected=true`; set `NOCTUSOFT_SQUARE_WEBHOOK_SIGNATURE_KEY_{PROD,SANDBOX}` + the product's webhook signing secret; register the relay's Square webhook. The Recipient Agreement text (v1) must match: see `docs/legal/RECIPIENT-AGREEMENT-v1.md` (attorney review pending).

## 10. Canary checklist (before flipping `PAYMENTS_VIA_RELAY=true` in prod)

1. Provision `fieldview` on the relay; set the Railway env above (sandbox values first).
2. Connect ONE sandbox coach via `/owners/payments` (agreement → OAuth → Location ID).
3. Run a `$1` charge (viewer checkout) → confirm 90/10 split + entitlement.
4. Issue an admin refund → confirm app-fee reversal + purchase status.
5. Exercise the webhook (`refund.updated`) via `test.squareup.noctusoft.com` → confirm 200 + status update.
6. Repeat on production values with a real coach before broad enablement.
7. Only after this passes: schedule **Slice F** (delete Model A / remove the fallback).
