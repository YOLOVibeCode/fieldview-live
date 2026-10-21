# FieldView.Live — Claude Code Project Rules

> Full engineering conventions (roles, TDD, ISP, Railway deploy, UI test-id rules) live in [`.cursorrules`](.cursorrules) — follow those too. This file records project-level **decisions** Claude must respect.

---

## 💳 Payment & Comms Architecture

> **Status (2026-10-21): payments are LIVE through the Noctusoft store marketplace.** The paywall plan,
> covering pricing, fees, pause and coupons, is [`docs/PAYWALL-PLAN.md`](docs/PAYWALL-PLAN.md). Follow it.

**Backbone = Noctusoft Relay.** Every payment, SMS and email call goes through Noctusoft services. **This repo
holds NO Square / Twilio / SendGrid / Google secrets.** It authenticates with `NOCTUSOFT_API_KEY`, a Railway
deploy key.

| Service | How FieldView reaches it |
|---|---|
| Payments | Noctusoft store marketplace, `NOCTUSOFT_STORE_BASE_URL` + `NOCTUSOFT_PRODUCT_KEY` (`packages/store-client`). The store runs on Square inside the relay; FieldView never calls Square. |
| SMS | Relay, `NOCTUSOFT_SMS_RELAY_BASE_URL` (`apps/api/src/lib/sms/RelaySmsClient.ts`) |
| Email | Relay, `NOCTUSOFT_RELAY_BASE_URL` (`RelayEmailProvider`, the default) |

**How a payment works:**
- **Seller onboarding:** each coach connects their **own** seller account
  (`StoreClient.getSellerOnboardingUrl`). FieldView stores only `marketplaceSellerKey`, never vendor tokens.
- **Checkout:** a **signed buy link** (`signConnectBuyLink`, HMAC with `FIELDVIEW_WEBHOOK_SECRET`) to
  `/buy/connect/{product}/{seller}`. The viewer pays on the store, and the money goes to the coach's account.
  **FieldView never holds coach funds.**
- **Platform fee:** exactly **10%**, taken by the store at charge time from the product's fee setting on the
  relay. Never raise it.
- **Webhook:** `POST /api/webhooks/marketplace` (event v1, signature-checked) marks the purchase paid,
  writes the ledger, and creates the entitlement.
- **Refunds:** `StoreClient.createRefund` (`/v1/refunds`), idempotent by refund id.
- The Square "Model A" integration and the Connect Hub charge path were removed (#234, #235). Do not bring
  them back. `docs/RELAY-CONNECT-HUB-MIGRATION.md`, `START-MARKETPLACE-CHECKLIST.md` and
  `DEPLOYMENT-MARKETPLACE-MODEL-A.md` are historical.

**Still gating the first real coach:** the attorney's review of the Recipient Agreement.

**🔒 Security:** the relay docs keys were redacted on 2026-07-19. If the previously exposed values were not
rotated, rotate them.

---

## Inherited rules
- Global rules in `~/.claude/CLAUDE.md` apply (e.g. Railway SSH via the Railway CLI).
- Match `.cursorrules` for roles, deploy workflow, TDD/ISP, monorepo structure, and UI automation (`data-testid`) requirements.
