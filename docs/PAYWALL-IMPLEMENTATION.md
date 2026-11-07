# Paywall Implementation Plan

How to build [PAYWALL-PLAN.md](PAYWALL-PLAN.md), Stages 2–5, as six PRs. Each PR lists its schema change, the
files to change, the tests to write first, and when it's done. File references are to `develop` once
#257 and #258 are merged; line numbers drift, so search by function name.

Prefixes: `api/` = `apps/api/src/`, `web/` = `apps/web/`, `dm/` = `packages/data-model/`.

---

## 0. Before starting

- **Merge first:** #256 (plans), #257 (Stage 1a access) and #258 (Stage 1b seller and refunds). Every PR below builds on #257's
  `checkStreamAccess` and token access.
- **Branches:** one per PR, cut from `develop`, opened against `develop`.
- **Toolchain:**
  - Node ≥ 22.12, since web tests need it; nvm `v26.9.0` works. pnpm `8.15.9`.
  - After changing `dm/`, run `pnpm --filter @fieldview/data-model build`. Both apps import the built `dist`.
- **Migrations:** add a new folder under `dm/prisma/migrations/` and stage it with `git add -f`, because the path is gitignored.
  Never edit an existing migration, and never run migrations against a real database. Railway runs `migrate deploy` on start.
- **Tests first** (`.cursorrules`). Route tests mock Prisma with `vi.mock('../../lib/prisma', …)` and mount the router on
  `express()` (see `api/routes/__tests__/direct.paywall-enforcement.test.ts`). Owner routes mock `../../middleware/auth`
  (see `owners.ledger.test.ts`). New UI gets `data-testid`s.
- **Done means** a PR with green CI, tests that ran, and a short "not tested" list.

## 1. Order

```
PR-A pause ─────────────┐
                        ├─> PR-D access scope ─> PR-E coupons
PR-B pricing module ─┬──┤
                     ├─> PR-C fee mode
                     └─> PR-F break-even (its season-vs-game view also needs PR-D)
```

- **Parallel:** PR-A and PR-B can run in parallel; they touch different code.
- **After PR-B:** PR-C and PR-D can start.
- **PR-D after PR-A:** both change the paywall decision in bootstrap, so PR-D goes after PR-A to avoid conflicts.
- **Coupons last:** PR-E needs PR-C and PR-D (fee mode, the $1 rule and game scope).

| PR | Stage | Schema change | Size |
|---|---|---|---|
| A | 2: pause until | yes | M |
| B | 3: shared pricing module, $1 minimum, fixed 10% | no | S |
| C | 3: fee mode (absorb / viewers pay) | yes | M |
| D | 3: access scope (season / game) | yes | L |
| E | 4: coupons on the paywall | yes | L |
| F | 5: break-even calculator | yes | M |

---

## 2. One paywall decision: `api/lib/paywall-state.ts`

PR-A introduces this, and PR-C and PR-D extend it. Today the paywall decision is repeated in six places:
- `direct.ts`: bootstrap, verify-access, the legacy GET, checkout
- `public.direct-stream-events.ts`
- `public.purchases.ts` (checkout-session)

The two direct-stream paths also ignore event overrides. Replace all of them with one function:

```ts
resolvePaywall({ stream, event, owner, now }) => {
  active: boolean;            // paywall on, not paused, price > 0
  paused: boolean; pausedUntil: Date | null; pauseNote: string | null;
  listPriceCents: number;     // event ?? stream (PR-D: per accessScope)
  viewerPriceCents: number;   // PR-C: after fee mode
  accessScope: 'season' | 'game';                // PR-D
  scopeKey: { directStreamId; directStreamEventId?: string };  // PR-D
}
```

Every caller does: `if (resolvePaywall(...).active) → checkStreamAccess(...)`.

---

## PR-A: Pause until (Stage 2, plan §2.3)

**Schema** (migration `…_paywall_pause`):
- `paywallPausedUntil DateTime?` and `paywallPauseNote String?` on `OwnerAccount`, `DirectStream` and `DirectStreamEvent`.
- New `OwnerAuditLog`: `id, ownerAccountId, ownerUserId?, actionType, targetType, targetId, details Json, createdAt`.
  - It's needed because `AdminAuditLog.adminUserId` is a required admin foreign key, and owners have no audit trail.

**API**
- **`api/lib/paywall-state.ts`** (new): `resolvePaywall`, covering pause only for now.
- **Use it everywhere the paywall is decided:**
  - `direct.ts`: bootstrap, verify-access and the legacy GET.
  - `public.direct-stream-events.ts`.
  - **Bootstrap response:** add `paywallPaused`, `paywallPausedUntil` and `paywallPauseNote`. While paused, `streamLocked` is false.
- **Refuse checkout while paused** with `409 PAYWALL_PAUSED`:
  - `PaymentService.createDirectStreamCheckout`
  - `public.purchases.ts` `createCheckoutSession`, which re-checks before building the buy link.
- **Owner routes:**
  - `PATCH /api/owners/me/paywall-pause` `{ pausedUntil: ISO | null, note? }` sets the account-wide pause. Put it in `owners.me.ts` or a new `owners.paywall.ts`.
  - `PATCH /api/owners/direct-streams/:id` accepts `paywallPausedUntil` and `paywallPauseNote` (`owners.direct-streams.ts` schema plus `OwnerDirectStreamService.updateStream`).
  - New `PATCH /api/owners/direct-streams/:id/events/:eventId` for the event pause. Owners have no event route today. Check ownership through the parent stream. PR-D adds price and end time to this route.
- **Validation:** `pausedUntil` must be in the future and at most 1 year out. `null` resumes.
- **Audit:** every pause and resume writes an `OwnerAuditLog` row. Superadmin changes go through the existing `auditLog` middleware.
- **Superadmin:** `PATCH /api/admin/direct-streams/:id` and `PATCH /api/admin/direct-stream-events/:id` accept the pause fields.

**Web**
- **Owner console:** `web/app/owners/direct-streams/page.tsx`, edit form.
  - "Pause paywall until [date/time] + note" with Resume.
  - The stream list shows "Free until …".
- **AdminPanel:** `web/components/AdminPanel.tsx`, paywall section. Same control for stream admins.
- **Superadmin:** `web/app/superadmin/direct-streams/EventManagement.tsx` gets the event pause; the stream row gets the stream pause.
- **Viewer page:** `web/components/DirectStreamPageBase.tsx` shows a pause banner next to `WelcomeMessageBanner`, in both portrait and landscape: "Free until 9:00 PM — Senior night".

**Tests first**
- **`resolvePaywall`:** pause at owner, stream or event level; expired pause; pause plus price 0; no pause.
- **Bootstrap:** paused → URL returned, `streamLocked` false. Pause expired → locked again. Use fake time.
- **Checkout and checkout-session:** `409` while paused.
- **Owner routes:**
  - Sets and clears the pause.
  - Rejects a past date.
  - Rejects another owner's stream or event.
  - Writes an audit row.
- **Web:** banner render, and the console pause control (submit → PATCH body).

**Done when:** a stream paused until T is free before T and paywalled after T, with no deploy or cron, at owner, stream
and event level.

---

## PR-B: Shared pricing module, $1 minimum, fixed 10% (Stage 3, plan §2.1)

**No schema change.**

**`dm/src/utils/pricing.ts`** (new; export it from `dm/src/utils/index.ts`). Pure functions:
- `PLATFORM_FEE_BPS = 1000`, `MIN_CHARGE_CENTS = 100`.
- `PROCESSING_ESTIMATE = { rateBps: 290, fixedCents: 30 }`, overridable through config (Square online; to be confirmed).
- `viewerPrice({ listCents, feeMode })` returns the amount the viewer is charged.
- `split({ chargedCents })` returns `{ platformFeeCents, processingCents, coachNetCents }`.
- `validateListPrice(cents)` returns `0 | ≥ 100`, otherwise an error.

**Replace both calculators:**
- `api/utils/feeCalculator.ts` and `dm/src/utils/feeCalculator.ts` become thin wrappers or go away.
- Callers to update:
  - `PaymentService` (game, channel and direct paths)
  - `webhooks.marketplace.ts`
  - `web/components/v2/WelcomeModal.tsx`
- Remove `PLATFORM_FEE_PERCENT` from `.env.example` and docs.

**Enforce the $1 minimum:**
- In every price schema: `direct.ts` settings, `owners.direct-streams.ts`, and `dm/src/schemas/{directStream,ownerDirectStream,directStreamAdmin,directStreamEvent}.ts`.
- In `payments-readiness.ts` `wouldChargeViewers`.
- **Price maximum:** the schemas disagree (99,999 vs 1,000,000 cents). Settle on one; suggested $10,000 (1,000,000).

**Ledger descriptions:** `LedgerService` hardcodes "10%"; read it from `PLATFORM_FEE_BPS`. Also drop the "Square" wording in
`owners.ledger.ts` `/me/transparency`.

**Tests first:**
- `pricing.test.ts`:
  - the $7 → $8.39 pass-through example
  - absorb math
  - rounding is always up for the viewer
  - minimum price edges: 0, 99, 100
- Update the existing feeCalculator tests to the new module.
- Price schema tests: 99¢ rejected.

**Done when:** one module produces every fee number, a 99¢ price is rejected everywhere, and no code reads `PLATFORM_FEE_PERCENT`.

---

## PR-C: Fee mode, absorb or viewers pay (Stage 3, plan §2.1)

**Schema:** `DirectStream.feeMode String @default("absorb")`, with values `'absorb' | 'pass_through'`.

**API**
- **Checkout charges the viewer price:** `PaymentService.createDirectStreamCheckout` sets `Purchase.amountCents = viewerPrice(list, feeMode)` and stores the estimated split.
- **Bootstrap:** returns `listPriceCents`, `viewerPriceCents` and `feeMode`. `priceInCents` stays as the viewer price, for older clients.
- **Owner and superadmin update routes and schemas:** accept `feeMode`.

**Web**
- **Console** (owner console and AdminPanel): an "I cover the fees" / "Viewers pay the fees" choice, with a live preview: "Viewers pay $8.39 · you get ≈ $7.00".
- **Viewer side** (`PaywallModal` and the blocker overlay in `DirectStreamPageBase`): show the viewer price, and "Includes fees" when passing fees on.

**Tests first:**
- Checkout amount per mode.
- The webhook ledger records the actual fees.
- Console preview numbers come from `pricing.ts`.
- The paywall shows "Includes fees".

**Done when:** a $7 stream with viewers paying the fees charges $8.39 in UAT sandbox, and the ledger shows the coach netting about $7.

---

## PR-D: Access scope, season or game (Stage 3, plan §2.2)

**Schema**
- `DirectStream.accessScope String @default("season")` and `DirectStream.seasonEndsAt DateTime?`.
- `DirectStreamEvent.scheduledEndAt DateTime?`.
- `Purchase.directStreamEventId String? @db.Uuid`, with a relation and index.

**API**
- **`resolvePaywall`** gains scope and pricing:
  - In game scope: `event ?? stream` for paywall, price and message. A stream with no events counts as one game.
  - In season scope: the stream's values apply to every event.
- **Checkout** records `directStreamEventId` in game scope.
  - Route: `PaymentService.createDirectStreamCheckout`, which already parses `parent/event`.
- **Access check:** `checkStreamAccess` matches the entitlement against `scopeKey`.
  - Game scope: the purchase's event must be this event.
  - Season scope: any event of the stream.
- **Access window:** `PurchaseFulfillmentService` sets `validTo` by scope, replacing today's "24h" line.
  - Season: `seasonEndsAt` + 2h.
  - Game: end + 2h, where the end is `scheduledEndAt`, or start + 4h; with no schedule, purchase time + 24h.
- **Guard:** turning on a season-scope paywall requires `seasonEndsAt`. Add this to the guard in `payments-readiness.ts`.
- **Owner event route** (from PR-A): also accepts `paywallEnabled`, `priceInCents`, `paywallMessage` and `scheduledEndAt`.
- **Fix:** `direct.ts POST /:slug/settings` currently writes paywall fields only to the parent, even from an event page. Route event-level paywall fields to the event.

**Web**
- **Owner console:**
  - "Each payment covers: a season / one game", plus the season end date.
  - In game scope, a per-game price and end time on each game row.
- **AdminPanel:** same fields.
- **`EventManagement`** (superadmin): per-game price and end time.
- **Paywall copy:** "Season pass, through Mar 15" or "This game only".

**Tests first:**
- **Season scope:** a pass works on two events and ends at `seasonEndsAt` + 2h.
- **Game scope:**
  - A pass for game 1 is refused on game 2.
  - The game-2 price falls back to the stream price.
  - The end-time fallbacks work.
- **Changing scope:** a purchase keeps the scope it was bought under.
- **Settings:** the event-level paywall save writes to the event.

**Done when:** a game-scope stream sells two games separately, with each pass ending 2h after its game, and a season pass ends at
`seasonEndsAt`.

---

## PR-E: Coupons on the paywall (Stage 4, plan §2.4)

**Schema**
- `CouponCode`:
  - Add `directStreamId?` and `directStreamEventId?`, both indexed.
  - Add `createdByOwnerUserId?`.
  - Make `createdByAdminId` nullable.
  - Add a check (in app code) that exactly one creator is set.
- `CouponRedemption`:
  - Add `status` (`reserved | committed | released`) and `expiresAt`.
  - Mark existing rows `committed`.
- `DirectStream.acceptPlatformCoupons Boolean @default(false)`.

**API**
- **`CouponService.validateCoupon`:**
  - Add stream and event scope; platform coupons apply only where the stream opted in.
  - Apply the $1 rule: a charge above $0 but under $1 is refused.
  - Fix the discount math through `pricing.ts`: the discount comes off the list price, then fee mode applies.
- **Counting uses:**
  - Replace `applyCoupon`'s separate increment with `reserve()`, one transaction and a row lock (`SELECT … FOR UPDATE`) that checks max uses and the per-viewer limit counting committed plus unexpired reserved.
  - Add `commit()` on the paid webhook and `release()` on failed or expired events.
  - Buy links expire after 24h (`exp`), so the reservation expiry matches it.
- **Checkout:**
  - `DirectStreamCheckoutSchema` (`dm/src/schemas/directStreamCheckout.ts`) gets `couponCode?`.
  - `createDirectStreamCheckout` applies it.
  - A **free (100%-off) code** skips the store: create a `paid` Purchase with amount 0, the entitlement and zero ledger rows, and return the watch URL directly.
- **Routes:**
  - `public.coupons.ts`: validate takes `directStreamSlug` (and event), not only `gameId`. Rate limit it; there's no limiter today.
  - **Coach coupons:** new `api/routes/owners.coupons.ts`, `GET/POST/PATCH /api/owners/me/coupons`. `ownerAccountId` is forced to the coach. Optional stream or event scope, validated to belong to the coach.
  - **Admin coupons** (`admin.coupons.ts`): validate that the scope references exist and belong together.

**Web**
- **Paywall:** `PaywallModal` gets a "Have a code?" field. Show the discount, the new price, and the $1 error.
- **Coach coupons page:** new `web/app/owners/coupons/page.tsx` (create, list, disable, usage counts) plus a dashboard card.
  - It warns when a code would bring a price under $1.
- **Admin coupons page:** `web/app/(admin)/coupons/page.tsx`.
  - Fix expiry: `type="date"` sends a date, but the API expects a datetime, so creating a coupon with an expiry fails.
  - Add owner, stream and event scope, and a minimum purchase.
  - Fix the e2e path (`/admin/coupons` vs `/coupons`).

**Tests first:**
- **Scope:** a coach code works only on that coach's streams; a platform code is refused without opt-in.
- **Counting:** abandoned checkout → the reservation expires → the use comes back. Concurrent reservations don't exceed `maxUses`.
- **$1 rule:** a 50¢ result is refused.
- **Free path:** a 100%-off code unlocks without calling the store.
- **Admin form:** the expiry is sent as a datetime.

**Done when:** these pass as tests and in a UAT sandbox run:
- A coach code works only on that coach's streams.
- A platform code is refused on a stream that hasn't opted in.
- Abandoned checkouts don't use up codes.
- A 100%-off code unlocks the stream without the store.
- A code that would leave 50¢ is refused.

---

## PR-F: Break-even calculator (Stage 5, plan §2.6)

**Schema:** `BreakEvenPlan`:
- `id, ownerAccountId, directStreamId?` (null means entity level), `seasonLabel`.
- `costLines Json`: `[{ label, amountCents, per: 'season' | 'game' }]`.
- `expectedGames, expectedDiscountBps, createdAt, updatedAt`.
- Unique on `(ownerAccountId, directStreamId)`.

**Shared math:** `dm/src/utils/breakEven.ts`, pure and built on `pricing.ts`.
- `netPerBuyer`
- `breakEvenBuyers` (season scope and game scope)
- `priceToBreakEven(expectedBuyers)`, at least $1
- `compareScopes`
- It replaces `calculateBreakeven` in `WelcomeModal.tsx`, which ignores processing.

**API:** new `api/routes/owners.break-even.ts`.
- **Plans:** `GET/PUT /api/owners/me/break-even?directStreamId=` to read and save a plan.
- **Progress:** `GET /api/owners/me/break-even/progress?directStreamId=` returns buyers and real coach net, season to date and per game.
  - `LedgerEntry` has no stream id, so join `referenceId` → `Purchase.directStreamId` (and `Refund.purchaseId` for refund rows).
- **Entity view:** `GET /api/owners/me/break-even/summary` adds up every stream with `ownerAccountId` equal to the association, plus entity-level costs. `DirectStream` has no Organization link.
- **Access:** only `owner_admin` and `association_admin` roles.

**Web**
- **Stream panel:** "Pricing & break-even" in the stream edit view.
  - Cost lines are prefilled with suggestions, e.g. Veo Live $65/month from `WelcomeModal`.
  - It shows the break-even buyers, the price to break even, the season-vs-game comparison, and a progress bar.
- **Entity page:** new `web/app/owners/finances/page.tsx`, "Season finances", for associations: totals and teams above or below break-even.
  Add it to the dashboard cards, since there's no nav component.

**Tests first:**
- **`breakEven.test.ts`:** $600 of costs and a $7 pass with fees absorbed gives 104 passes; also game scope and price to break even.
- **Progress:** sums the coach net per stream and nets out refunds.
- **Entity view:** the summary adds up across teams.
- **Access:** the role check.

**Done when:**
- The $600 / $7 example shows 104 passes.
- The count updates as real passes sell.
- An association sees the total across its teams.

---

## 3. Who builds it

- **Here:** each PR as a branch and PR in this repo, one at a time, in the order above.
- **Cloud agents:** each PR section is written to work as a brief for Slack `@CloudAgents` (Composer 2.5). PR-A and PR-B can run in parallel. Paste the section plus a link to this file.

## 4. Still open

- **Processing rate:** the store's card-processing rate is unconfirmed; the default is 2.9% + 30¢. It's one constant in `pricing.ts`.
- **Recipient Agreement:** the attorney's review is still pending before the first real coach.
- **Lite viewer:** `/lite` has its own paywall check, which has never unlocked paid viewers. Fold it into `resolvePaywall` and the token in PR-A or later.
- **Old Playwright specs:** `paywall*.spec.ts` and `lite-viewer.spec.ts` still seed the old localStorage flag. Update them with PR-A.
