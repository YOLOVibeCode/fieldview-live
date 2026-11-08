# Vendored: `@noctusoft/store-client`

`index.js`, `index.d.ts` and `README.md` in this folder are **verbatim copies** of
`packages/store-client` in the `noctusoft-relay` repository. That package is the
relay's own client: the relay's test suite checks it against the relay's signer,
verifier and routes, so it is the source of truth for the store contract.

Source: https://github.com/rvegajr/noctusoft-relay/tree/main/packages/store-client
Commit: d60b3855a7a18a3831622b7c3b6714a741f2902a
Synced: 2026-11-07

## Rules

- Never edit `index.js`, `index.d.ts` or `README.md` here. Fix the relay's copy, then re-sync.
- `package.json` and this file are FieldView's (the scripts are no-ops so the
  workspace's `build`, `lint`, `type-check` and `test` filters stay green).
- Re-sync with `scripts/sync-store-client.sh [git-ref]` (default `main`). It
  downloads the three files at that commit and records the commit above.

## How FieldView uses it

FieldView's adapter is `apps/api/src/services/MarketplaceStoreService.ts`.
It only ever calls the Connect Hub routes the relay documents
(`docs/api/store/README.md`, "Marketplace"):

| FieldView action | Relay route (via the client) |
|---|---|
| Coach accepts the Recipient Agreement | `POST /connect/fieldview/recipients/{sellerKey}/agreement` — `seller.agree({ version })` |
| Coach connects payouts | `POST /connect/fieldview/recipients/{sellerKey}/onboard` — `seller.onboard({ returnUrl, email, productDescription })` → `{ url }` |
| Payments-readiness check | `GET /connect/fieldview/recipients/{sellerKey}` — `seller.status()` → `{ status, chargesEnabled, payoutsEnabled, sellerRef, agreementVersion, agreementAcceptedAt }` |
| Viewer checkout | a signed `/buy/connect/fieldview/{sellerKey}` link — `signConnectBuyLink(...)`, no relay call |
| Refund | `POST /connect/fieldview/recipients/{sellerKey}/refunds` — `seller.refund(paymentRef, { amountCents, idempotencyKey })` |
| Inbound events | `verifyWebhook(...)` on `x-noctusoft-signature` / `x-relay-signature` |

The seller key is the coach's `OwnerAccount.id`. The signing secret for buy
links and inbound events is `FIELDVIEW_WEBHOOK_SECRET` (the product's Connect
signing key on the relay). The relay key is `NOCTUSOFT_API_KEY`.
