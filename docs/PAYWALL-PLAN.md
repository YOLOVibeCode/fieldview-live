# Paywall Plan

**Status:** decided by the owner on 2026-10-21 and 2026-10-22. This is the source of truth for how
the DirectStream paywall, coupons, pausing and the break-even calculator work. Where older docs
disagree (fee percentage, Square, Connect Hub), this document wins.

Payments go through the Noctusoft store marketplace: the viewer pays on a store-hosted
buy link, and the money lands in the coach's own seller account. FieldView never holds coach
funds and holds no payment-vendor secrets. See [CLAUDE.md](../CLAUDE.md) for the plumbing.

---

## 1. Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | What one payment buys | The coach chooses per stream: **one season** (every game in the stream until the season ends) or **one game**. |
| 2 | Fees | Per stream, the coach chooses to **absorb** the fees or **pass them on to the viewer**. Passing them on adds both the 10% platform fee and card processing on top of the coach's price. Platform-wide coupons only apply on a stream if the coach **opts in**, and their discount comes out of the coach's take. |
| 3 | Coupons | Coaches can create their own coupons. Platform admins can create platform-wide coupons. |
| 4 | Pausing | "Pause until": a time-boxed pause that ends on its own. No open-ended pause. |
| 5 | Platform fee | Exactly **10%**, never more. The relay's fee setting is 10% on `fieldview`, `fieldview-uat` and `fieldview-dev`. |
| 6 | Minimum charge | The store's minimum charge is **$1.00**. |
| 7 | Break-even calculator | Coaches and entities (associations) get a calculator that shows how many buyers they need to cover their costs, and tracks real sales against it. |

---

## 2. Rules

### 2.1 Price and fees

- The coach sets a **list price** (`P`): a season price, or a per-game price.
- **Minimum price:** a paid price is at least **$1.00**. `P` is either 0 (free) or ≥ 100 cents.
  - The API and the console both reject prices from 1 to 99 cents.
  - Any charge that would end up under $1 is refused before it reaches the store (see coupons, 2.4).
- The platform fee is **10% of what the viewer pays**. The store takes it at charge time from the
  product's fee setting on the relay (`connect_apps` row = 1000 bps). FieldView never sends a
  different rate and never configures more than 10%.
  - `PLATFORM_FEE_PERCENT` goes away. Replace it with a constant `PLATFORM_FEE_BPS = 1000`, used only for
    FieldView's own estimates and ledger.
- **Card processing is separate** from the 10% and comes out of the coach's seller account.
  - FieldView estimates it from config. The default is Square online pricing, 2.9% + 30¢; to be confirmed for the store.
  - The ledger records the **actual** processing and platform fee from the paid webhook (`processor_fee_cents`, `money.feeCents`).
- **Fee mode** is a per-stream setting, `DirectStream.feeMode`: `'absorb'` (default) or `'pass_through'`.
  The console labels them "I cover the fees" and "Viewers pay the fees".
  - **absorb:** the viewer pays `P`. The coach nets `P − 10% − processing`.
  - **pass_through:** both the 10% platform fee and card processing are passed on to the viewer. The viewer pays `G`,
    rounded up to the cent, so the coach nets about `P`:

    ```
    G = ceil( (P + processingFixed) / (1 − 0.10 − processingRate) )
    ```

    Example with 2.9% + 30¢ processing: `P = $7.00` gives `G = ceil(730 / 0.871) = $8.39`.
    The platform takes $0.84 and processing takes $0.54, so the coach nets about $7.00.
- In pass-through mode, the coach's net can differ from `P` by a few cents, because processing is an estimate.
- In pass-through mode, the paywall shows the total and the line "Includes fees".
- **One pricing module:** all of this math lives in a single shared module (`packages/data-model`). It is used by
  checkout, the paywall display, the ledger estimates and the break-even calculator, so they always agree.

### 2.2 What a purchase unlocks

- **Setting:** `DirectStream.accessScope` is `'season'` (default) or `'game'`, chosen by the coach.
- **Season (`'season'`):**
  - One payment at the stream's price unlocks every game in the stream: current events, future events, and the stream itself.
  - Access lasts until **`DirectStream.seasonEndsAt`** plus 2 hours. The coach must set that date before the paywall can go on.
  - To make one game free, pause the paywall on that game (2.3).
- **Game (`'game'`):**
  - Each game is sold separately.
  - A game is a `DirectStreamEvent`. A stream with no events counts as one game.
  - **Price:** the game's own price, falling back to the stream's (`event ?? stream` for `paywallEnabled`, `priceInCents` and `paywallMessage`).
  - **Purchase:** the Purchase records `directStreamEventId`, and access is checked against that game only.
  - **How long access lasts:** until 2 hours after the game ends.
    - The end is `scheduledEndAt`, a new optional field.
    - Without an end time, it's `scheduledStartAt` + 4 hours.
    - If the game has no schedule at all, access lasts 24 hours from purchase.
- **Where the rule applies:** the same scope and expiry rules are used by all of these:
  - bootstrap (`GET /api/direct/:slug/bootstrap`)
  - `verify-access`
  - checkout
  - the paid webhook, which sets the entitlement's `validTo`
- **Changing scope:** when a coach changes the scope, existing purchases keep the scope they were bought under.

### 2.3 Pause until

- **Fields:** `paywallPausedUntil` (timestamp) and `paywallPauseNote` (optional, e.g. "Senior night, free").
  They exist on three levels:
  - `OwnerAccount`: every stream the coach owns
  - `DirectStream`: one stream
  - `DirectStreamEvent`: one game
- **When it applies:** the paywall is paused when any applicable level has `paywallPausedUntil > now`.
- **No cron:** pausing is worked out on every request, so it ends on its own. The price and paywall
  settings are untouched, so the paywall comes back exactly as it was.
- **While paused:**
  - Bootstrap returns the stream to everyone, and the paywall modal isn't shown.
  - The pause note shows as a banner.
  - Checkout is refused (`409 PAYWALL_PAUSED`), so nobody pays for something that's free right now.
  - Entitlements bought before the pause stay valid.
- **Who:**
  - A coach can pause their own account, streams and games.
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
- **Below the $1 minimum:**
  - If the discounted charge is above $0 but under $1, the code is refused: "This code brings the price under the $1 minimum."
  - The coach console warns about this when the coupon is created.
- **Free (`P' = 0`):** skip the store entirely.
  - Create a `paid` Purchase with amount 0, the entitlement, and zero-amount ledger rows.
  - The redemption is committed right away.
- **Usage counting:**
  - At checkout, a `CouponRedemption` row is reserved, with `status = 'reserved'` and an expiry matching the buy link's `exp`.
  - On the paid webhook it becomes `status = 'committed'`. It's released on `failed` or `expired` events, or when the reservation's expiry passes.
  - Uses = committed + unexpired reserved. The check and the reservation run in one transaction with a row lock on the coupon.
  - A refund does not release a use.
- **Viewer:**
  - The paywall modal gets a "Have a code?" field.
  - The validate endpoint takes the stream (and game) slug, so it can check scope and opt-in.
  - The validate endpoint is rate limited.
- **Admin coupon page:**
  - Fix the expiry field: it sends a date, and the API wants a datetime.
  - Add owner, stream and game scope, and a minimum purchase.

### 2.5 Seller disconnects and refunds

- When the coach's seller can no longer take charges (`seller.updated` with `chargesEnabled: false`, or the
  status check says not connected):
  - The coach is no longer payment-ready, and viewers see "Payments unavailable".
  - The coach can still turn the paywall off or pause it.
- A full refund revokes the entitlement. A partial refund keeps it.

### 2.6 Break-even calculator

**Who it's for:**
- A coach, for one stream.
- An entity (an association `OwnerAccount`), for all its teams' streams together.
- Only the account's owners and admins see it.

**Inputs** (saved, so progress can be tracked):
- **Costs**, as named lines, each either **per season** or **per game**. Suggested starter lines the coach can edit:
  - Per season: camera or Veo subscription, equipment, streaming or data plan.
  - Per game: staff or announcer, hotspot, travel.
- **Games in the season:** taken from the stream's games, or entered by hand.
- **Price and settings:** prefilled from the stream's settings: price, access scope, fee mode, accepting platform coupons.
- **Expected discount:** optionally, the average coupon discount the coach expects to give.

**Outputs.** Every number uses the shared pricing module (2.1) with the 10% fee and the processing estimate.
- **Per buyer:** what the coach nets from one purchase, and what the viewer pays, for each fee mode.
- **Break-even buyers:**
  - Season scope: `ceil(total season costs / net per season pass)` passes.
  - Game scope: `ceil((per-game costs + season costs / games) / net per game)` buyers per game.
- **Price to break even:** the lowest price, at least $1, that covers costs at an expected number of buyers the coach types in.
- **Season vs. game comparison:** the same costs under both scopes, so the coach can choose.
- **Actual progress:** buyers so far and the coach's real net earnings from the ledger, against the
  break-even line, per game and season to date.

**Entity view:**
- Sums each team's plan.
- Adds entity-level costs that are shared across teams.
- Shows which teams are above or below break-even.

**Where:**
- A "Pricing & break-even" panel in each stream's owner settings.
- A "Season finances" page for entities.
- It's read-only math; nothing changes until the coach saves stream settings.

---

## 3. Stages

Each stage is one PR (or a small set) with tests written first. The file-level development plan, split into six PRs
(A–F), is [PAYWALL-IMPLEMENTATION.md](PAYWALL-IMPLEMENTATION.md).

### Stage 1: foundation (security and unlock), done in #257 and #258
- **#257, access:** unlock with the purchase token or the stream admin's JWT; close the legacy URL leak;
  "Email me my watch link"; event checkout; admin bypass; failed and timeout states on the success page.
- **#258, seller and refunds:** seller disconnect handling, and full refunds revoke access.

### Stage 2: pause until
Section 2.3: fields, rules, owner-console and superadmin controls, banner, and the `409` on checkout.

**Done when:** a stream paused until T is free before T and paywalled after T, with no deploy or cron.

### Stage 3: pricing, fees and access scope
- **Shared pricing module (2.1):**
  - Replace `PLATFORM_FEE_PERCENT` with the constant.
  - Enforce the $1 minimum.
  - Add `feeMode` and pass-through pricing.
  - Change the paywall display.
- **Access scope (2.2):**
  - Add `accessScope`, `seasonEndsAt`, `DirectStreamEvent.scheduledEndAt` and `Purchase.directStreamEventId`.
  - Per-game pricing in the console.
  - Entitlement `validTo` set by the scope.

**Done when:**
- A $7 stream in pass-through mode charges $8.39 and the ledger shows the coach netting about $7.
- A game-scope stream sells two games separately, and each pass ends 2 hours after its game.
- A season pass ends at `seasonEndsAt`.
- A 99¢ price is rejected.

### Stage 4: coupons on the paywall
Section 2.4: coach coupon page, scope fields, platform opt-in, reserve/commit counting, the free path,
the $1 rule, and the admin page fixes.

**Done when:**
- A coach code works only on that coach's streams.
- A platform code is refused on a stream that hasn't opted in.
- Abandoned checkouts don't use up codes.
- A 100%-off code unlocks the stream without the store.
- A code that would leave 50¢ is refused.

### Stage 5: break-even calculator
Section 2.6: `BreakEvenPlan` storage, the calculator on top of the shared pricing module, the stream panel,
the entity page, and actual progress from the ledger.

**Done when:**
- For a coach with $600 of season costs, a $7 season pass and absorb mode, the panel shows **104 passes** to break even ($5.80 net per pass after the 10% and estimated processing), and the count updates as real passes sell.
- An entity sees the total across its teams.

---

## 4. Data model changes (summary)

| Model | New fields |
|---|---|
| `DirectStream` | `feeMode`, `accessScope`, `seasonEndsAt`, `acceptPlatformCoupons`, `paywallPausedUntil`, `paywallPauseNote` |
| `DirectStreamEvent` | `scheduledEndAt`, `paywallPausedUntil`, `paywallPauseNote` (price and paywall overrides already exist) |
| `OwnerAccount` | `paywallPausedUntil`, `paywallPauseNote` |
| `Purchase` | `directStreamEventId` (nullable) |
| `CouponCode` | `directStreamId`, `directStreamEventId` (nullable); `createdByOwnerUserId` (nullable); `createdByAdminId` becomes nullable |
| `CouponRedemption` | `status` (`reserved` / `committed` / `released`), `expiresAt` |
| `BreakEvenPlan` (new) | `ownerAccountId`, `directStreamId` (null = entity level), `seasonLabel`, `costLines` (JSON: label, amountCents, per `season`/`game`), `expectedGames`, `expectedDiscountBps`, timestamps |

---

## 5. Open questions

1. **Processing rate:** what does the store charge for card processing? The plan assumes 2.9% + 30¢ (Square online) until confirmed. It's only used for pass-through prices and break-even estimates; the ledger always records the actual fee.
2. **Recipient Agreement:** the attorney review of `RECIPIENT-AGREEMENT-v1` is still pending before the first real coach.
