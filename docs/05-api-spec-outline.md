# API Specification Outline (OpenAPI-ready)

This document lists endpoints and schema outlines. It is structured for direct translation to OpenAPI YAML.

## Common patterns
### Authentication
- **Owner/admin**: session-based (cookie) or token-based (Bearer)
- **Admin**: requires MFA (TOTP) for high-risk actions
- **Public**: entitlement token in URL or header

### Error model (shared)
```json
{
  "error": {
    "code": "string", // e.g., "GAME_NOT_FOUND", "INVALID_TOKEN"
    "message": "string", // human-readable
    "details": {} // optional context
  }
}
```

### Pagination (where applicable)
- Query params: `?page=1&limit=50`
- Response: `{ "data": [], "pagination": { "page": 1, "limit": 50, "total": 100 } }`

## Public (Viewer) APIs

### Game landing
- `GET /public/games/{gameId}` → game info for payment page
  - **Response**: `GamePublicView` (title, teams, startsAt, price, state, currency)

### Purchase
- `POST /public/games/{gameId}/checkout` → create checkout/payment intent
  - **Request**: `CheckoutCreateRequest` (**viewerEmail required**, viewerPhone optional, returnUrl)
  - **Response**: `CheckoutCreateResponse` (providerCheckoutUrl | clientSecret)
- `GET /public/purchases/{purchaseId}` → purchase status
  - **Response**: `PurchaseStatus` (status, amount, entitlementToken if paid)

### Watch
- `GET /public/watch/{token}` → watch page bootstrap (validates entitlement)
  - **Response**: `WatchBootstrapResponse` (playbackUrl/manifestUrl, state, validTo, gameInfo)
- `POST /public/watch/{token}/sessions` → create playback session
  - **Request**: `PlaybackSessionCreate` (deviceHash optional)
  - **Response**: `PlaybackSession` (sessionId, startedAt)
- `POST /public/watch/{token}/sessions/{sessionId}/telemetry` → submit session telemetry summary
  - **Request**: `TelemetrySummary` (totalWatchMs, totalBufferMs, bufferEvents, fatalErrors, startupLatencyMs)
  - **Response**: `{ "success": true }`

### Schema outlines (Public)
```typescript
interface GamePublicView {
  id: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string; // ISO 8601
  priceCents: number;
  currency: string;
  state: "draft" | "active" | "live" | "ended" | "cancelled";
}

interface CheckoutCreateRequest {
  viewerEmail: string; // Required for viewer identity and monitoring
  viewerPhone?: string; // E.164, optional (used for SMS delivery)
  returnUrl?: string;
}

interface CheckoutCreateResponse {
  checkoutUrl?: string; // redirect URL
  clientSecret?: string; // for Stripe Elements
  purchaseId: string;
}

interface PurchaseStatus {
  id: string;
  status: "created" | "paid" | "failed" | "refunded";
  amountCents: number;
  entitlementToken?: string; // if paid
}

interface WatchBootstrapResponse {
  playbackUrl: string; // HLS manifest URL
  state: "not_started" | "live" | "ended" | "unavailable";
  validTo: string; // ISO 8601
  gameInfo: {
    title: string;
    startsAt: string;
  };
}

interface TelemetrySummary {
  totalWatchMs: number;
  totalBufferMs: number;
  bufferEvents: number;
  fatalErrors: number;
  startupLatencyMs: number;
}
```

## SMS Webhooks

### Inbound SMS
- `POST /webhooks/sms/inbound` (Twilio-compatible)
  - **Request**: Twilio webhook format (From, To, Body, MessageSid)
  - **Behavior**: Parses inbound message → finds game by keyword → responds with SMS body
  - **Response**: TwiML or empty (async response via Twilio API)

### SMS status callbacks (optional)
- `POST /webhooks/sms/status`
  - **Request**: Twilio status callback (MessageSid, Status)
  - **Behavior**: Update SMSMessage status

## Payment Webhooks

### Square
- `POST /webhooks/payments/square`
  - **Request**: Square webhook event (payment.created, payment.updated, refund.created, etc.)
  - **Behavior**:
    - On `payment.created` / `payment.updated` (succeeded):
      - Mark purchase paid
      - Create/lookup ViewerIdentity by email
      - Create entitlement
      - Send watch link SMS
    - On `refund.created`:
      - Update purchase status
      - Create refund record
      - Update ledger
  - **Response**: `{ "received": true }` (acknowledge webhook)

## Owner/Association APIs

### Authentication
- `POST /owners/auth/login` → email/password → session cookie
- `POST /owners/auth/logout`
- `POST /owners/auth/reset-password` → request reset
- `POST /owners/auth/reset-password/confirm` → confirm reset with token

### Owners
- `POST /owners` → create owner account (public registration)
  - **Request**: `OwnerCreateRequest` (email, password, name, type)
  - **Response**: `OwnerAccount`
- `GET /owners/me` → get current owner account
  - **Response**: `OwnerAccount`

### Games
- `GET /owners/me/games` → list games (paginated)
  - **Query**: `?state=active&page=1&limit=50`
  - **Response**: `Game[]`
- `POST /owners/me/games` → create game
  - **Request**: `GameCreateRequest` (title, homeTeam, awayTeam, startsAt, priceCents, optional endsAt)
  - **Response**: `Game` (with generated keywordCode and QR URL)
- `GET /owners/me/games/{gameId}` → get game
  - **Response**: `Game`
- `PATCH /owners/me/games/{gameId}` → update game
  - **Request**: `GameUpdateRequest` (partial fields)
  - **Response**: `Game`
- `POST /owners/me/games/{gameId}/cancel` → cancel game
  - **Response**: `Game`
- `POST /owners/me/games/{gameId}/keyword/rotate` → rotate keyword (optional; policy-limited)
  - **Response**: `Game` (with new keywordCode)

### Analytics
- `GET /owners/me/analytics/summary` → overview (time-series totals)
  - **Query**: `?startDate=2025-01-01&endDate=2025-01-31`
  - **Response**: `AnalyticsSummary` (totalRevenue, totalRefunds, netRevenue, gameCount, purchaseCount)
- `GET /owners/me/games/{gameId}/analytics` → per-game analytics
  - **Response**: `GameAnalytics` (purchases, grossRevenue, refunds, netRevenue, qualityScore)
- `GET /owners/me/games/{gameId}/audience` → audience monitoring (purchasers + watchers)
  - **Response**: `GameAudience` (purchasers with masked emails, watchers with session counts)

### Payouts
- `GET /owners/me/payouts` → payout history
  - **Response**: `Payout[]`

### Schema outlines (Owner)
```typescript
interface OwnerAccount {
  id: string;
  type: "owner" | "association";
  name: string;
  email: string;
  status: "active" | "suspended" | "pending_verification";
  payoutProviderRef?: string;
  createdAt: string;
}

interface Game {
  id: string;
  title: string;
  homeTeam: string;
  awayTeam: string;
  startsAt: string;
  endsAt?: string;
  state: "draft" | "active" | "live" | "ended" | "cancelled";
  priceCents: number;
  currency: string;
  keywordCode: string;
  qrUrl: string;
  createdAt: string;
}

interface AnalyticsSummary {
  totalRevenueCents: number;
  totalRefundsCents: number;
  netRevenueCents: number;
  gameCount: number;
  purchaseCount: number;
  period: { startDate: string; endDate: string };
}

interface GameAnalytics {
  gameId: string;
  purchaseCount: number;
  grossRevenueCents: number;
  refundsCents: number;
  netRevenueCents: number;
  qualityScore: number; // 0-100
}

interface GameAudience {
  gameId: string;
  purchasers: PurchaserInfo[];
  watchers: WatcherInfo[];
  purchaseToWatchConversionRate: number; // 0-1
}

interface PurchaserInfo {
  purchaseId: string;
  emailMasked: string; // e.g., "j***@example.com"
  purchasedAt: string; // ISO 8601
  amountCents: number;
  watched: boolean; // Did this purchaser watch?
}

interface WatcherInfo {
  purchaseId: string;
  emailMasked: string; // e.g., "j***@example.com"
  sessionCount: number;
  lastWatchedAt: string; // ISO 8601
  totalWatchTimeMs: number;
}
```

## Internal Admin APIs

### Authentication
- `POST /admin/auth/login` → email/password + MFA → session cookie
- `POST /admin/auth/mfa/verify` → verify TOTP
- `POST /admin/auth/logout`

### Search
- `GET /admin/search` → global search
  - **Query**: `?query=+15551234567` or `?query=user@example.com` or `?query=EAGLES22` or `?query=pay_123`
  - **Response**: `SearchResults` (viewers, games, purchases)
  - **Note**: Supports email search for viewer identity lookup

### Support operations
- `POST /admin/purchases/{purchaseId}/refund` → manual refund
  - **Request**: `ManualRefundRequest` (amountCents, reason)
  - **Response**: `Refund`
- `POST /admin/viewers/{viewerId}/resend-watch-link` → resend watch link SMS
  - **Request**: `ResendLinkRequest` (purchaseId)
  - **Response**: `{ "success": true }`
- `POST /admin/games/{gameId}/disable-keyword` → disable keyword immediately
  - **Response**: `Game`

### Purchase detail
- `GET /admin/purchases/{purchaseId}` → full purchase detail with timeline
  - **Response**: `PurchaseDetail` (purchase, entitlement, sessions, refunds, smsMessages)

### Refund investigation
- `GET /admin/purchases/{purchaseId}/refund-investigation` → refund decision details
  - **Response**: `RefundInvestigation` (telemetrySummary, computedMetrics, appliedRule, thresholdVersion)

### Audience monitoring (SuperAdmin)
- `GET /admin/owners/{ownerId}/games/{gameId}/audience` → audience with full email visibility
  - **Response**: `GameAudienceAdmin` (purchasers + watchers with full emails, unmasked)
  - **Note**: SuperAdmin-only; all access is audit-logged

### Audit
- `GET /admin/audit` → audit log (SuperAdmin)
  - **Query**: `?adminUserId=...&targetType=...&startDate=...&endDate=...`
  - **Response**: `AdminAuditLog[]`

### Configuration (SuperAdmin only)
- `GET /admin/config` → get platform configuration
  - **Response**: `PlatformConfig` (platformFeePercent, refundThresholds)
- `PATCH /admin/config` → update platform configuration (bounded)
  - **Request**: `PlatformConfigUpdate` (partial fields)
  - **Response**: `PlatformConfig`

### Schema outlines (Admin)
```typescript
interface SearchResults {
  viewers: ViewerIdentity[];
  games: Game[];
  purchases: Purchase[];
}

interface PurchaseDetail {
  purchase: Purchase;
  entitlement?: Entitlement;
  sessions: PlaybackSession[];
  refunds: Refund[];
  smsMessages: SMSMessage[];
}

interface RefundInvestigation {
  purchaseId: string;
  telemetrySummary: TelemetrySummary;
  computedMetrics: {
    bufferRatio: number;
    totalWatchMs: number;
    totalBufferMs: number;
  };
  appliedRule: string;
  thresholdVersion: string;
  refundAmountCents: number;
}

interface GameAudienceAdmin {
  gameId: string;
  purchasers: PurchaserInfoAdmin[];
  watchers: WatcherInfoAdmin[];
  purchaseToWatchConversionRate: number;
}

interface PurchaserInfoAdmin {
  purchaseId: string;
  email: string; // Full email (unmasked) for SuperAdmin
  phoneE164?: string; // If provided
  purchasedAt: string;
  amountCents: number;
  watched: boolean;
  sessionCount: number;
}

interface WatcherInfoAdmin {
  purchaseId: string;
  email: string; // Full email (unmasked) for SuperAdmin
  phoneE164?: string; // If provided
  sessionCount: number;
  lastWatchedAt: string;
  totalWatchTimeMs: number;
  sessions: PlaybackSessionSummary[];
}

interface PlaybackSessionSummary {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  totalWatchMs: number;
  totalBufferMs: number;
}

interface PlatformConfig {
  platformFeePercent: number; // e.g., 20
  refundThresholds: {
    fullRefundBufferRatio: number; // e.g., 0.20
    halfRefundBufferRatio: number; // e.g., 0.10
    excessiveBufferingEvents: number; // e.g., 10
    partialRefundPercent: number; // e.g., 25
  };
}
```

## Authorization notes
- **Public endpoints**: accept entitlement token (watch) or no auth (game landing, checkout)
- **Owner endpoints**: require OwnerUser authentication
- **Admin endpoints**: require SupportAdmin/SuperAdmin + MFA for high-risk actions
- **SuperAdmin-only**: configuration updates, account suspension, audit log access
