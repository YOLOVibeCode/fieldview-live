# Functional Requirements (MVP)

Each requirement includes scope tags, acceptance criteria, and API mappings.

## FR-1 Game Management
**Scope**: **Core**

### Capabilities
- Create/edit/cancel games
- Define title/teams, start time, optional end time
- Set price per game (in cents, currency)
- Generate and manage keyword/text code (uniqueness enforced)
- Generate QR URL
- **Association-only**: group games by field/venue, multi-operator scheduling

### States
- `draft`: created but not yet active
- `active`: keyword/QR enabled, accepting purchases
- `live`: stream is active (ingest detected)
- `ended`: stream ended or game time passed
- `cancelled`: owner/admin cancelled; no new purchases

### Error handling
- Keyword collision: auto-suggest alternative
- Invalid start time (past): reject or warn
- Price too low/high: warn (configurable bounds)

### Success metrics
- Time to create game: < 60 seconds
- Keyword uniqueness: 100% enforced

### Acceptance criteria
- Owner can create a game with a unique keyword in under 60 seconds
- Cancelling a game prevents new purchases and updates SMS/QR landing behavior
- Keyword remains stable unless explicitly rotated

### API endpoints
- `POST /owners/me/games` (create)
- `GET /owners/me/games` (list)
- `GET /owners/me/games/{gameId}` (get)
- `PATCH /owners/me/games/{gameId}` (update)
- `POST /owners/me/games/{gameId}/cancel` (cancel)
- `POST /owners/me/games/{gameId}/keyword/rotate` (rotate keyword)

## FR-2 Keyword Routing + SMS Automation
**Scope**: **Core**

### Capabilities
- Inbound SMS webhook parses keyword, normalizes input (case-insensitive, whitespace trimmed), matches active game
- Outbound SMS templates:
  - payment request (game title/time, price, payment link)
  - payment confirmation + watch link
  - refund notification (amount, reason, processing time)
  - HELP response (instructions, support contact)
  - STOP confirmation (opt-out confirmed)
- SMS compliance: maintain opt-out state per phone number

### Error handling
- Unknown keyword: friendly error response
- Game expired/cancelled: status message + next game (if configured)
- SMS delivery failure: retry with exponential backoff; alert admin if persistent

### Success metrics
- Inbound SMS response time: < 2s p95
- SMS delivery success rate: > 95%

### Acceptance criteria
- Unknown keyword returns a helpful error response (no silent failures)
- STOP immediately prevents future outbound marketing messages
- HELP returns instructions within 2 seconds

### API endpoints
- `POST /webhooks/sms/inbound` (Twilio-compatible)
- `POST /webhooks/sms/status` (optional delivery status)

## FR-3 Payments
**Scope**: **Core**

### Capabilities
- Mobile checkout supporting Apple Pay / Google Pay / card
- **Email address required at checkout** (for viewer identity and monitoring)
- Phone number optional (used for SMS delivery)
- Marketplace split:
  - platform fee (% configurable by SuperAdmin)
  - owner earnings (gross - platform fee - processor fee)
  - payment processor fees (Square: 2.9% + $0.30)
- Webhooks drive entitlement creation and SMS confirmation
- Payment attempt tracking (created → paid → failed)
- **ViewerIdentity creation/lookup by email** (for monitoring who purchased/watched)

### States
- `created`: payment intent created
- `paid`: payment succeeded
- `failed`: payment failed (card declined, etc.)
- `refunded`: fully refunded
- `partially_refunded`: partial refund issued

### Error handling
- Payment failed: show retry; do not generate entitlement
- Webhook retry: idempotent handling; do not create duplicate entitlements
- Split calculation errors: alert admin; do not process payout until resolved

### Success metrics
- Payment success rate: > 90%
- Time from payment to watch link: < 10s p95

### Acceptance criteria
- A successful payment always results in an entitlement + watch link delivery
- Failed payment never generates entitlement
- Split calculations are accurate (gross - platform fee - processor fee = owner net)
- **Email address is required at checkout** (validation rejects missing email)
- **ViewerIdentity is created/looked up by email** for every purchase

### API endpoints
- `POST /public/games/{gameId}/checkout` (create checkout; requires viewerEmail)
- `GET /public/purchases/{purchaseId}` (status)
- `POST /webhooks/payments/square` (payment webhook)

## FR-4 Entitlements (Access Control)
**Scope**: **Core**

### Capabilities
- Entitlement token is:
  - signed (JWT or similar)
  - time-bound (validFrom, validTo)
  - tied to a specific game and purchase
- Entitlement validates on watch page load and during playback session startup
- Multiple sessions allowed within validity window (device switching)

### States
- `active`: valid and within time window
- `expired`: past validTo
- `revoked`: manually revoked by admin

### Error handling
- Expired token: show expiration message
- Invalid signature: reject with error
- Revoked token: show revocation message

### Success metrics
- Token validation latency: < 100ms p95
- Token security: no unauthorized access (0% false positives)

### Acceptance criteria
- Shared/expired tokens do not grant access
- Entitlement validity window is configurable per game (defaults defined in [06-nonfunctional-and-compliance.md](./06-nonfunctional-and-compliance.md))
- Token signature verification is cryptographically secure
- **Tokens must not be reusable beyond validity window** (one-time use or short expiration)
- **Watch page bootstrap validates entitlement** before returning playback URL
- **Session creation validates entitlement** and links to Purchase→ViewerIdentity for monitoring

### API endpoints
- `GET /public/watch/{token}` (validate + bootstrap)
- `POST /public/watch/{token}/sessions` (create session)

## FR-5 Stream Ingestion & Playback
**Scope**: **Core**

### Capabilities
- Support RTMP ingest from camera/encoder
- Browser playback via HLS (baseline)
- Clear error UI states (stream not started, ended, unavailable)
- Stream state detection (not started / live / ended / unavailable)

### States
- `not_started`: game time not reached or ingest not detected
- `live`: ingest active, stream available
- `ended`: ingest stopped or game time passed
- `unavailable`: ingest failed or stream error

### Error handling
- Stream unavailable: show error + refund eligibility message
- Ingest failure: alert owner/admin; auto-refund if game time passed
- Playback errors: capture telemetry for refund evaluation

### Success metrics
- Watch start latency (player to first frame): < 5s p95
- Stream availability: > 95% uptime during scheduled game time

### Acceptance criteria
- Watch page shows deterministic state for: not started / live / ended / error
- Stream playback works on mobile browsers (iOS Safari, Chrome Android)

### API endpoints
- `GET /public/watch/{token}` (bootstrap with playback URL/manifest)
- (Streaming infrastructure: RTMP ingest → HLS output; not API endpoints)

## FR-6 Quality Telemetry
**Scope**: **Core**

### Capabilities
- Capture playback telemetry required for refunds:
  - total watch time (milliseconds)
  - buffering time (milliseconds)
  - number of buffering events
  - fatal playback errors
  - startup latency (milliseconds)
- Store telemetry per session and aggregate per purchase

### Error handling
- Telemetry submission failure: retry with exponential backoff
- Missing telemetry: use conservative defaults (assume worst case for refunds)

### Success metrics
- Telemetry capture rate: > 95% of sessions
- Telemetry accuracy: matches actual playback behavior

### Acceptance criteria
- Telemetry is stored per session and summarized per purchase
- Telemetry summaries are immutable once game ends (for refund determinism)
- **PlaybackSession is linked to ViewerIdentity** (via Entitlement→Purchase→ViewerIdentity) for monitoring queries
- **Session creation records viewer identity** for "who watched" tracking

### API endpoints
- `POST /public/watch/{token}/sessions/{sessionId}/telemetry` (submit telemetry)

## FR-7 Automatic Refunds
**Scope**: **Core**

### Capabilities
- Implement refund rules per [07-refund-and-quality-rules.md](./07-refund-and-quality-rules.md)
- Notify viewer via SMS
- Reflect refund adjustments in owner analytics
- Create ledger entries (refund debit, payout adjustment)

### Refund triggers (see [07-refund-and-quality-rules.md](./07-refund-and-quality-rules.md) for details)
- Full refund: buffer ratio > 20%
- Half refund: buffer ratio 10-20%
- Partial refund: excessive buffering events (> 10)
- Fatal errors: configurable (default: half refund if watch time < 2 minutes)

### Error handling
- Refund processing failure: retry + alert admin
- Refund exceeds purchase amount: cap at purchase amount

### Success metrics
- Refund decision time: < 5 minutes after game ends
- Refund accuracy: 100% deterministic (reproducible from telemetry)

### Acceptance criteria
- Refund calculations are reproducible from stored telemetry summaries
- Refund notification SMS is sent within 5 minutes of decision
- Owner dashboard shows refund reason and amount

### API endpoints
- Internal processing (refund evaluation + issuance)
- `POST /webhooks/payments/stripe` (refund webhook confirmation)

## FR-8 Owner/Association Dashboard
**Scope**: **Core** (Owner-only), **Association-only** (consolidated reporting)

### Capabilities
- Per-game view: purchasers, gross/net, refunds, quality score
- Time-series: weekly/monthly totals
- Payout status and history
- **Audience monitoring**: view who purchased and watched games
  - Purchasers list (masked email: `j***@example.com`)
  - Watchers list (who actually watched, session counts, last watched timestamp)
  - Purchase-to-watch conversion rate
- **Association-only**: consolidated reporting across fields/teams

### Error handling
- Data load failure: show error + retry
- Stale data: show last updated timestamp

### Success metrics
- Dashboard load time: < 2s p95
- Data accuracy: matches ledger records (100%)

### Acceptance criteria
- Dashboard numbers match ledgered payment/refund records
- Per-game analytics load within 2 seconds p95
- Payout status is accurate and up-to-date
- **Owner can view audience list** (purchasers + watchers) for their games
- **Emails are masked** for privacy (e.g., `j***@example.com`) in owner view
- **Owner can export audience data** (CSV with masked emails)
- **Owner can see purchase-to-watch conversion** per game

### API endpoints
- `GET /owners/me/analytics/summary` (overview)
- `GET /owners/me/games/{gameId}/analytics` (per-game)
- `GET /owners/me/games/{gameId}/audience` (purchasers + watchers, masked emails)
- `GET /owners/me/payouts` (payout history)

## FR-9 Internal Admin & Super Admin Console
**Scope**: **Core**

### Capabilities
- Search by phone, **email**, keyword, game, payment ID
- View full timeline (SMS ↔ payment ↔ entitlement ↔ playback)
- Support actions (audited):
  - resend SMS links
  - manual refund (within policy)
  - disable keyword/game
  - **view full viewer email** (unmasked, for support)
- Admin authentication: email/password + MFA
- **SuperAdmin-only**: configure platform fee/refund thresholds, suspend accounts
- **SuperAdmin-only**: drill down by owner → game → audience (full email visibility)

### Error handling
- Search timeout: show error + suggest narrower query
- Action failure: show error + retry option

### Success metrics
- Search response time: < 2s p95
- Audit log completeness: 100% of admin actions logged

### Acceptance criteria
- Every admin action writes an immutable audit record
- High-risk actions require step-up confirmation
- Search returns relevant results within 2 seconds p95
- **Admin can search by email** to find viewer purchases/sessions
- **SuperAdmin can view audience by owner** (filter: owner → game → audience)
- **Full email addresses visible** to SuperAdmin (unmasked) for support/compliance
- **All access to viewer identity data is audit-logged**

### API endpoints
- `GET /admin/search` (search; includes email query)
- `POST /admin/purchases/{purchaseId}/refund` (manual refund)
- `POST /admin/viewers/{viewerId}/resend-watch-link` (resend link)
- `POST /admin/games/{gameId}/disable-keyword` (disable keyword)
- `GET /admin/audit` (audit log)
- `GET /admin/owners/{ownerId}/games/{gameId}/audience` (SuperAdmin: audience with full emails)
- `PATCH /admin/config` (SuperAdmin: configure thresholds)

(Full specification: [08-admin-and-superadmin.md](./08-admin-and-superadmin.md))
