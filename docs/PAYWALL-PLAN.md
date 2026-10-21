# Paywall Plan

**Status:** decided by the owner on 2026-10-21. This is the source of truth for how the
DirectStream paywall, coupons and pausing work. Where older docs disagree (fee percentage,
Square, Connect Hub), this document wins.

Payments go through the Noctusoft store marketplace: the viewer pays on a store-hosted
buy link, and the money lands in the coach's own seller account. FieldView never holds coach
funds and holds no payment-vendor secrets. See [CLAUDE.md](../CLAUDE.md) for the plumbing.

---

## 1. Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | What one payment buys | One payment unlocks one stream, including all its events. A coach can switch a stream to sell each event separately. |
| 2 | Fees | Per stream, the coach chooses to **absorb** the fees or **add them on top** of the viewer's price. Platform-wide coupons only apply on a stream if the coach **opts in**, and their discount comes out of the coach's take. |
| 3 | Coupons | Coaches can create their own coupons. Platform admins can create platform-wide coupons. |
| 4 | Pausing | "Pause until": a time-boxed pause that ends on its own. No open-ended pause. |
| 5 | Platform fee | Exactly **10%**, never more. |

---

## 2. Rules

### 2.1 Price and fees

- The coach sets a **list price** (`P`) per stream, and per event when the stream sells events separately.
- The platform fee is **10% of what the viewer pays**. The store takes it at charge time from the
  product's fee setting on the relay (`connect_apps` row = 1000 bps). FieldView never sends a
  different rate and never configures more than 10%.
  - `PLATFORM_FEE_PERCENT` goes away. Replace it with a constant `PLATFORM_FEE_BPS = 1000`, used only for
    FieldView's own estimates and ledger.
- **Fee mode** is a per-stream setting, `DirectStream.feeMode`: `'absorb'` (default) or `'pass_through'`.
  - **absorb:** the viewer pays `P`. The coach nets `P − 10% − processing`.
  - **pass_through:** the viewer pays `G`, rounded up to the cent, so the coach nets about `P`:

    ```
    G = ceil( (P + processingFixed) / (1 − 0.10 − processingRate) )
    ```

    Example, assuming 2.9% + 30¢ processing: `P = $7.00` gives `G = ceil(730 / 0.871) = $8.39`.
    The platform takes $0.84 and processing takes $0.54, so the coach nets about $7.00.
- The processing rate and fixed fee are **estimates** from config, since the store's real rate isn't
  known in this repo. The ledger records the **actual** `processor_fee_cents` and `money.feeCents` from
  the paid webhook. In pass-through mode, the coach's net can differ from `P` by a few cents.
- In pass-through mode, the paywall shows the total and the line "Includes fees".

### 2.2 What a purchase unlocks

- **Setting:** `DirectStream.purchaseScope` is `'stream'` (default) or `'event'`.
- **`stream` scope:** one payment unlocks the stream and every event under it.
  - Event-level price fields are ignored.
  - To make a single event free, pause the paywall on that event (2.3).
- **`event` scope:** each event is sold separately.
  - The event's paywall settings fall back to the parent stream's (`event ?? parent` for `paywallEnabled`, `priceInCents` and `paywallMessage`).
  - The Purchase records `directStreamEventId`.
  - Access is checked against that event.
- These all use the same rule:
  - bootstrap (`GET /api/direct/:slug/bootstrap`)
  - `verify-access`
  - checkout
  - the paid webhook
- How long access lasts is an open question (section 5). Today it's 24h from payment.

### 2.3 Pause until

- **Fields:** `paywallPausedUntil` (timestamp) and `paywallPauseNote` (optional, e.g. "Senior night, free").
  They exist on three levels:
  - `OwnerAccount`: every stream the coach owns
  - `DirectStream`: one stream
  - `DirectStreamEvent`: one event
- **When it applies:** the paywall is paused when any applicable level has `paywallPausedUntil > now`.
- **No cron:** pausing is worked out on every request, so it ends on its own. The price and paywall
  settings are untouched, so the paywall comes back exactly as it was.
- **While paused:**
  - Bootstrap returns the stream to everyone, and the paywall modal isn't shown.
  - The pause note shows as a banner.
  - Checkout is refused (`409 PAYWALL_PAUSED`), so nobody pays for something that's free right now.
  - Entitlements bought before the pause stay valid.
- **Who:**
  - A coach can pause their own account, streams and events.
  - Superadmin can pause anything.
  - Every pause and resume is written to the audit log.

### 2.4 Coupons

- **Coach coupons:**
  - Created by the coach (owner console).
  - `ownerAccountId` is always the coach's account.
  - Optional narrower scope: `directStreamId` or `directStreamEventId`.
- **Platform coupons:**
  - Created by superadmin, with `ownerAccountId = null`.
  - They apply on a stream only when `DirectStream.acceptPlatformCoupons = true` (default `false`).
- **Order of operations:** the discount comes off the list price first, `P' = max(0, P − discount)`.
  Then fee mode applies to `P'`. Both kinds of discount come out of the coach's take.
- **Usage counting:**
  - At checkout, a `CouponRedemption` row is reserved, with `status = 'reserved'` and an expiry matching the buy link's `exp`.
  - On the paid webhook it becomes `status = 'committed'`. It's released on `failed` or `expired` events, or when the reservation's expiry passes.
  - Uses = committed + unexpired reserved. The check and the reservation run in one transaction with a row lock on the coupon.
  - A refund does not release a use.
- **Free (`P' = 0`):** skip the store entirely.
  - Create a `paid` Purchase with amount 0, the entitlement, and zero-amount ledger rows.
  - The redemption is committed right away.
- **Below the store's minimum charge** (`0 < G < minimum`): refuse the code with a clear message. The minimum is an open question.
- **Viewer:**
  - The paywall modal gets a "Have a code?" field.
  - The validate endpoint takes the stream (and event) slug, so it can check scope and opt-in.
  - The validate endpoint is rate limited.
- **Admin coupon page:**
  - Fix the expiry field: it sends a date, and the API wants a datetime.
  - Add owner, stream and event scope, and a minimum purchase.

### 2.5 Seller disconnects and refunds

- When the coach's seller can no longer take charges (`seller.updated` with `chargesEnabled: false`, or the
  status check says not connected):
  - The coach is no longer payment-ready, and viewers see "Payments unavailable".
  - The coach can still turn the paywall off or pause it.
- A full refund revokes the entitlement. A partial refund keeps it.

---

## 3. Stages

Each stage is one PR with tests written first.

### Stage 1: foundation (security and unlock)
Fixes from the 2026-10-21 paywall check:
1. **Legacy endpoint:** `GET /api/direct/:slug` returns `streamUrl` for paywalled streams. Remove it, or gate it with the entitlement check.
2. **Access token after payment:**
   - The success page's "Watch" link and the receipt email use `/direct/<slug>?access=<entitlementToken>`.
   - The page saves the token and sends it to bootstrap and `verify-access`.
   - Access is granted by that token or a signed viewer token, **never by an email or viewerId in the query string**.
3. **Success page:** add a real "Payment failed" state and a polling timeout that falls back to "Check your email".
4. **Event pages:** checkout and `verify-access` must parse `parent/event` slugs, the way bootstrap does.
5. **Seller disconnect:** handle it as described in 2.5.
6. **Refunds:** a full refund revokes the entitlement.
7. **Admin unlock:** stream admins who unlocked with the admin password get past the paywall.

**Done when:**
- An anonymous viewer pays in sandbox and watches without signing in.
- The legacy endpoint no longer leaks the stream URL.
- An event page can check out.
- A refunded viewer is locked out.

### Stage 2: pause until
Section 2.3: fields, rules, owner-console and superadmin controls, banner, and the `409` on checkout.

**Done when:** a stream paused until T is free before T and paywalled after T, with no deploy or cron.

### Stage 3: fees and purchase scope
- Section 2.1: replace `PLATFORM_FEE_PERCENT` with the constant, add `feeMode` and the pass-through pricing, and change the paywall display.
- Section 2.2: add `purchaseScope`, `Purchase.directStreamEventId`, and per-event pricing in the console.

**Done when:**
- In pass-through mode, a $7 stream charges the grossed-up amount and the ledger shows the coach netting about $7.
- A per-event stream sells two events separately.

### Stage 4: coupons on the paywall
Section 2.4: coach coupon page, scope fields, platform opt-in, reserve/commit counting, the free path, and the admin page fixes.

**Done when:**
- A coach code works only on that coach's streams.
- A platform code is refused on a stream that hasn't opted in.
- Abandoned checkouts don't use up codes.
- A 100%-off code unlocks the stream without the store.

---

## 4. Data model changes (summary)

| Model | New fields |
|---|---|
| `DirectStream` | `feeMode`, `purchaseScope`, `acceptPlatformCoupons`, `paywallPausedUntil`, `paywallPauseNote` |
| `DirectStreamEvent` | `paywallPausedUntil`, `paywallPauseNote` (price and paywall overrides already exist) |
| `OwnerAccount` | `paywallPausedUntil`, `paywallPauseNote`; `chargesEnabled` (or clear `paymentsConnectedAt`) for seller disconnects |
| `Purchase` | `directStreamEventId` (nullable) |
| `CouponCode` | `directStreamId`, `directStreamEventId` (nullable); `createdByOwnerUserId` (nullable); `createdByAdminId` becomes nullable |
| `CouponRedemption` | `status` (`reserved` / `committed` / `released`), `expiresAt` |

---

## 5. Open questions

1. **How long does access last?** Today it's 24h from payment. The older spec (docs/06) says game end + 2h. With whole-stream purchases, options are: until the stream's current event ends, a fixed window, or a season.
2. **Store minimum charge:** what is it, and does the store accept a $0 buy link? This plan assumes free codes never reach the store.
3. **Store processing rate:** needed to calculate pass-through prices.
4. **Relay fee setting:** confirm the `connect_apps` fee is 1000 bps for `fieldview`, `fieldview-dev` and `fieldview-uat`.
5. **Recipient Agreement:** the attorney review of `RECIPIENT-AGREEMENT-v1` is still pending before the first real coach.
