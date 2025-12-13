# User Flows (MVP)

This document describes end-to-end user experiences. Each flow maps to functional requirements (FR) and API endpoints.

## Flow A — Viewer Text-to-Pay (Primary)
### Happy path
1. Viewer sees signage: "Text `EAGLES22` to (xxx) xxx-xxxx"
2. Viewer sends SMS: `EAGLES22`
3. System receives inbound SMS webhook → parses keyword → finds active game
4. System replies with SMS:
   - Game title/time
   - Price
   - Payment link (mobile web URL)
5. Viewer clicks payment link → mobile checkout page loads
6. Viewer enters **email address (required)** and optionally phone number
7. Viewer completes payment (Apple Pay/Google Pay/card)
8. Payment webhook confirms → system creates/looks up ViewerIdentity by email → creates Purchase → creates entitlement → sends SMS confirmation with watch link
9. Viewer clicks watch link → watch page validates entitlement → creates PlaybackSession linked to viewer → playback begins

**Maps to**: FR-2 (SMS), FR-3 (Payments), FR-4 (Entitlements), FR-5 (Playback)

**APIs**: `POST /webhooks/sms/inbound`, `POST /public/games/{gameId}/checkout`, `POST /webhooks/payments/square`, `GET /public/watch/{token}`, `POST /public/watch/{token}/sessions`

### Edge cases
- **Unknown keyword**: reply with friendly error + how to get help (e.g., "Code not found. Check the sign or text HELP.")
- **Keyword for expired/cancelled game**: reply with status and next upcoming game (if configured)
- **Game not live yet**: allow purchase; watch link either (a) works with countdown/preview, or (b) sent at start time (MVP default: countdown watch page)
- **Payment failed**: show retry; do not generate entitlement
- **User texts STOP**: immediately opt out per SMS compliance; do not send future marketing messages
- **User texts HELP**: reply with instructions and support contact
- **Duplicate keyword texts**: idempotent handling; if already paid, resend watch link

### Acceptance criteria
- System responds to inbound keyword SMS within 2 seconds p95 (excluding carrier delivery)
- Payment confirmation triggers watch-link SMS within 10 seconds p95
- Watch link works without login
- STOP/HELP responses are immediate

## Flow B — Viewer QR-to-Pay (Secondary)
1. Viewer scans QR code
2. QR landing page loads (mobile optimized) → shows game info + price
3. Viewer clicks "Pay" → payment page loads
4. Viewer enters **email address (required)** and optionally phone number
5. Viewer completes payment
6. Payment webhook confirms → system creates/looks up ViewerIdentity by email → creates Purchase → creates entitlement
7. Viewer is redirected to watch page (and may also receive SMS/email link)
8. Watch page validates entitlement → creates PlaybackSession linked to viewer → playback begins

**Maps to**: FR-3 (Payments), FR-4 (Entitlements), FR-5 (Playback)

**APIs**: `GET /public/games/{gameId}`, `POST /public/games/{gameId}/checkout`, `POST /webhooks/payments/square`, `GET /public/watch/{token}`, `POST /public/watch/{token}/sessions`

### Edge cases
- QR scanned for cancelled/expired game: show status + next game
- QR scanned before game start: allow purchase; show countdown on watch page

### Acceptance criteria
- QR landing page is mobile optimized and loads within 2s p95 on LTE
- Payment → watch redirect is seamless

## Flow C — Owner Create Game
1. Owner logs in
2. Owner navigates to "Create Game"
3. Owner enters:
   - Teams/title
   - Start time (and optional end time)
   - Price
   - Optional: venue/field (Association-only: select from list)
4. System generates:
   - Keyword/text code (checks uniqueness; suggests alternative if collision)
   - QR URL
5. Owner downloads signage template or copies instructions

**Maps to**: FR-1 (Game Management)

**APIs**: `POST /owners/me/games`, `GET /owners/me/games/{gameId}`

### Edge cases
- **Keyword collision**: system auto-suggests next available (e.g., `EAGLES22` → `EAGLES23`)
- **Start time changed**: keyword remains stable unless explicitly rotated
- **Game cancelled**: keyword disabled; SMS/QR landing pages show cancellation

### Acceptance criteria
- Game creation completes in < 60 seconds for a typical owner
- Keyword uniqueness is enforced (globally or per-owner; MVP default: globally)

## Flow D — Playback + Telemetry
1. Viewer loads watch page with entitlement token
2. Watch page validates entitlement → creates PlaybackSession linked to Purchase→ViewerIdentity → shows state (not started / live / ended / unavailable)
3. If live, player starts
4. Client records telemetry:
   - playback start/stop
   - buffering start/end
   - fatal errors
   - network switches
5. On session end or game end, telemetry summary is saved for refund evaluation
6. PlaybackSession is linked to ViewerIdentity (via Purchase) for monitoring queries

**Maps to**: FR-5 (Playback), FR-6 (Quality Telemetry)

**APIs**: `GET /public/watch/{token}`, `POST /public/watch/{token}/sessions`, `POST /public/watch/{token}/sessions/{sessionId}/telemetry`

### Edge cases
- **Viewer switches networks/devices**: new session created; entitlement allows multiple sessions within validity window
- **Stream not started yet**: show countdown/preview
- **Stream ended**: show ended state + replay availability (if Post-MVP)
- **Stream unavailable**: show error + refund eligibility message

### Acceptance criteria
- Telemetry is captured reliably (buffering events, total watch time, fatal errors)
- Telemetry summary is stored per session and aggregated per purchase

## Flow E — Automatic Refund
1. System computes quality metrics for a purchase (or aggregate sessions) after game ends or periodically
2. If thresholds met (per [07-refund-and-quality-rules.md](./07-refund-and-quality-rules.md)), refund is issued
3. Viewer receives SMS refund notification (amount, reason, processing time)
4. Owner dashboard reflects refund and reason
5. Ledger entries are created (refund debit, payout adjustment)

**Maps to**: FR-7 (Automatic Refunds)

**APIs**: Internal processing + `POST /webhooks/payments/stripe` (refund webhook)

### Edge cases
- **Multiple sessions**: aggregate telemetry across sessions within entitlement validity
- **Partial refund**: owner dashboard shows partial refund reason
- **Refund fails**: retry + alert admin

### Acceptance criteria
- Refund decision is deterministic and auditable (inputs and calculations recorded)
- Refund notification SMS is sent within 5 minutes of decision

## Flow F — Owner Dashboard
1. Owner logs in
2. Owner views:
   - Per-game stats: purchasers, gross/net, refunds, quality score
   - Time-series: weekly/monthly totals
   - Payout status
3. Owner can drill into a game → see purchase list + refunds
4. Owner can view **audience** for a game:
   - List of purchasers (masked email: `j***@example.com`)
   - Who watched (playback sessions per purchase)
   - Last watched timestamp
   - Session counts per viewer

**Maps to**: FR-8 (Owner/Association Dashboard)

**APIs**: `GET /owners/me/analytics/summary`, `GET /owners/me/games/{gameId}/analytics`, `GET /owners/me/games/{gameId}/audience`

### Edge cases
- **No games yet**: show onboarding guidance
- **Refund adjustments**: show net revenue after refunds
- **No audience yet**: show empty state with guidance

### Acceptance criteria
- Dashboard numbers match ledgered payment/refund records
- Per-game analytics load within 2 seconds p95
- Audience list shows masked emails (privacy protection)
- Owner can see who purchased and watched their games

## Flow H — Owner Views Audience
1. Owner navigates to a game detail page
2. Owner clicks "Audience" tab
3. System displays:
   - Purchasers list (masked email, purchase date, amount)
   - Watchers list (who actually watched, session count, last watched)
   - Export option (CSV with masked emails)

**Maps to**: FR-8 (Owner/Association Dashboard)

**APIs**: `GET /owners/me/games/{gameId}/audience`

### Acceptance criteria
- Audience data loads within 2 seconds p95
- Emails are masked for privacy (e.g., `j***@example.com`)
- Owner can see purchase-to-watch conversion rate

## Flow G — Internal Support Operations
1. Admin logs in (MFA required)
2. Admin searches by phone, **email**, keyword, payment ID, or game ID
3. Admin views unified timeline:
   - inbound SMS
   - outbound SMS
   - payment attempts/status
   - entitlement creation
   - playback session summaries
   - refund decisions
4. Admin can:
   - resend payment/watch link (if policy allows)
   - issue manual refund (within policy bounds)
   - disable keyword/game
   - view refund investigation (inputs + rule applied)
   - **view full viewer email** (unmasked, for support purposes)
5. All actions are audit-logged

## Flow I — SuperAdmin Views Audience by Owner
1. SuperAdmin logs in (MFA required)
2. SuperAdmin navigates to owner list or searches for specific owner
3. SuperAdmin selects an owner → views owner's games
4. SuperAdmin selects a game → views **audience** (full email addresses, unmasked)
5. SuperAdmin can drill down:
   - View all purchases for a game
   - View all playback sessions for a purchase
   - See viewer identity (email, phone if provided)
   - Export audience data (CSV with full emails)

**Maps to**: FR-9 (Internal Admin & Super Admin Console)

**APIs**: `GET /admin/owners/{ownerId}/games`, `GET /admin/owners/{ownerId}/games/{gameId}/audience`

### Acceptance criteria
- SuperAdmin can filter by owner → game → audience
- Full email addresses visible (unmasked) for support/compliance
- All access to viewer identity data is audit-logged
- Export includes full viewer details

**Maps to**: FR-9 (Internal Admin & Super Admin Console)

**APIs**: `GET /admin/search`, `POST /admin/purchases/{purchaseId}/refund`, `POST /admin/viewers/{viewerId}/resend-watch-link`, `GET /admin/audit`

### Edge cases
- **Search returns multiple matches**: show list with context
- **Manual refund exceeds policy**: require SuperAdmin approval
- **Resend link for expired entitlement**: show warning + allow if within grace period

### Acceptance criteria
- Search returns results within 2 seconds p95
- Every admin action writes an immutable audit record
- High-risk actions require step-up confirmation

(Full internal panel requirements: [08-admin-and-superadmin.md](./08-admin-and-superadmin.md))
