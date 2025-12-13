# Admin + Super Admin Console Specification (Support Ops)

## Purpose
Provide internal tooling to support customers (owners/associations) and viewers by diagnosing issues across SMS, payments, entitlements, playback, and refunds.

## Internal roles
- **SupportAdmin**: day-to-day support operations
- **SuperAdmin**: all SupportAdmin capabilities plus high-risk/global controls

## Authentication (MVP)
- **Email/password + MFA (TOTP)** required for all internal roles
- **Session timeout**: 8 hours inactivity
- **Step-up authentication**: required for high-risk actions (refunds, disabling keywords, config changes)
- **Password policy**: minimum 12 characters, complexity requirements

## Global requirements
- **Audit logging**: all admin actions are recorded in `AdminAuditLog` (append-only, immutable)
- **Unified timeline view**: screens must show a chronological timeline:
  - inbound SMS
  - outbound SMS
  - payment attempts/status
  - entitlement creation
  - playback session summaries
  - refund decisions
- **Search-first UX**: persistent search bar; fast results (< 2s p95)

## Core features

### 1) Global Search
**Inputs**: phone number (E.164), **email address**, keyword, game ID, purchase/payment ID

**Outputs**:
- Matching viewers (with recent purchases)
- Matching games (with stats)
- Matching purchases (with timeline)

**Acceptance criteria**:
- Search returns results within 2 seconds p95 for typical queries
- Supports partial matches (e.g., last 4 digits of phone, partial keyword, partial email)
- **Email search enables viewer identity lookup** for monitoring

**API**: `GET /admin/search?query=...`

### 2) Viewer Detail
**Displays**:
- Phone number (masked where appropriate: `+1***-***-4567`)
- Opt-out status
- Recent purchases (last 10)
- SMS message history (last 20)

**Actions**:
- **Resend watch link** (if paid; policy-limited to prevent abuse)
- **View purchase detail** (navigate to purchase timeline)

**Acceptance criteria**:
- Viewer detail loads within 1 second p95
- Resend link requires confirmation

**API**: `GET /admin/viewers/{viewerId}`, `POST /admin/viewers/{viewerId}/resend-watch-link`

### 3) Game Detail
**Displays**:
- Owner/association name
- Game info (title, teams, time, price)
- Keyword status (active/disabled/rotated)
- Game state (draft/active/live/ended/cancelled)
- Purchase counts, refunds, quality score
- Recent purchases (last 20)
- **Audience tab**: purchasers + watchers (SupportAdmin: masked emails; SuperAdmin: full emails)

**Actions**:
- **Disable keyword** (immediate; prevents new purchases)
- **Cancel game** (if not ended)
- **View owner dashboard** (navigate to owner account)
- **View audience** (purchasers + watchers with identity details)

**Acceptance criteria**:
- Game detail loads within 1 second p95
- Disable keyword requires confirmation
- **Audience tab shows purchasers and watchers** with appropriate email masking

**API**: `GET /admin/games/{gameId}`, `POST /admin/games/{gameId}/disable-keyword`, `GET /admin/owners/{ownerId}/games/{gameId}/audience` (SuperAdmin)

### 4) Purchase Detail
**Displays**:
- Payment status, amounts (gross/net/platform fee)
- **Viewer identity** (email, phone if provided; SupportAdmin: masked email; SuperAdmin: full email)
- Entitlement status/validity
- Playback session telemetry summaries
- Refund status (if any)
- SMS message timeline (inbound/outbound)
- Unified timeline (all events chronologically)

**Support actions**:
- **Resend payment link** (if payment not completed)
- **Resend watch link** (if paid)
- **Manual refund** (within allowed bounds)
- **View refund investigation** (if refund issued or eligible)
- **View viewer identity** (full email for support purposes; audit-logged)

**Acceptance criteria**:
- Purchase detail loads within 1 second p95
- Manual refund requires:
  - reason code
  - amount (bounded by purchase amount)
  - step-up confirmation
  - audit log entry

**API**: `GET /admin/purchases/{purchaseId}`, `POST /admin/purchases/{purchaseId}/refund`, `GET /admin/purchases/{purchaseId}/refund-investigation`

### 5) Refund Investigation View
**Displays**:
- Which rule triggered (or why not)
- Inputs used (telemetry summary: `watchMs`, `bufferMs`, `bufferEvents`, `fatalErrors`, `streamDownMs`)
- Computed metrics (`bufferRatio`, `downtimeRatio`)
- Applied rule and threshold version
- Refund amount (if issued)

**Purpose**: enable support staff to explain refund decisions to viewers/owners

**Acceptance criteria**:
- Refund investigation loads within 1 second p95
- Shows deterministic calculation (reproducible from stored data)

**API**: `GET /admin/purchases/{purchaseId}/refund-investigation`

### 6) Owner Account Detail
**Displays**:
- Owner/association info
- Account status (active/suspended/pending_verification)
- Recent games (last 20)
- Revenue summary (gross/net/refunds)
- Payout status

**Actions** (SuperAdmin only):
- **Suspend account** (with reason)
- **View audit log** (all actions affecting this owner)

**Acceptance criteria**:
- Owner account detail loads within 1 second p95
- Suspend account requires step-up confirmation + reason

**API**: `GET /admin/owners/{ownerId}`, `POST /admin/owners/{ownerId}/suspend` (SuperAdmin)

### 7) Operational Safety Controls
- **Rate limiting**: limit admin actions per admin user (e.g., 50 actions per minute)
- **Read-only mode**: SupportAdmin has read-only access to global configuration
- **Action confirmations**: high-risk actions require confirmation dialogs
- **Audit log visibility**: all admins can view their own audit log; SuperAdmin can view all

## SuperAdmin-only controls (MVP)

### Platform Configuration
- **Configure platform fee %** (bounded: 10-30%)
- **Configure refund thresholds** (bounded: see [07-refund-and-quality-rules.md](./07-refund-and-quality-rules.md))
- **Configure partial refund percent** (bounded: 10-50%)

**Acceptance criteria**:
- Config changes require step-up confirmation
- Config changes are audit-logged with version tracking

**API**: `GET /admin/config`, `PATCH /admin/config` (SuperAdmin)

### Account Management
- **Suspend owner account** (with reason)
- **View audit logs** across all admin users
- **Impersonate owner account** (optional; highly audited; use with caution)
- **View audience by owner**: drill down owner → games → audience (full email visibility)

**Acceptance criteria**:
- Suspend account requires reason + step-up confirmation
- Impersonation is logged prominently in audit log
- **SuperAdmin can filter by owner → game → audience** to see all viewers
- **Full email addresses visible** to SuperAdmin (unmasked) for support/compliance
- **All access to viewer identity data is audit-logged**

**API**: `POST /admin/owners/{ownerId}/suspend`, `GET /admin/audit`, `POST /admin/impersonate/{ownerId}` (SuperAdmin, optional), `GET /admin/owners/{ownerId}/games/{gameId}/audience` (SuperAdmin)

## UX requirements
- **Desktop-first**: mobile not required; desktop-optimized UI
- **Fast to use**: under support pressure, common actions should be < 3 clicks
- **Persistent search bar**: always visible at top
- **Copy-to-clipboard buttons**: for IDs, phone numbers, payment IDs
- **Timeline view**: chronological event list for quick diagnosis
- **Keyboard shortcuts**: common actions (e.g., `/` to focus search)

## Audit log schema (minimum)
- `id`: unique identifier
- `adminUserId`: who performed the action
- `actionType`: `refund_create`, `resend_sms`, `keyword_disable`, `owner_suspend`, `config_update`, `impersonate`, `view_audience`, `view_viewer_identity`, etc.
- `targetType`: `purchase`, `game`, `owner`, `config`, `viewer`, etc.
- `targetId`: ID of target entity
- `reason`: optional reason text
- `requestMetadata`: JSON snapshot (IP, user agent, but redact sensitive data)
- `createdAt`: timestamp

**Note**: Actions accessing viewer identity data (e.g., `view_viewer_identity`, `view_audience`) must be audit-logged for compliance.

**API**: `GET /admin/audit` (with filters: `?adminUserId=...&targetType=...&startDate=...&endDate=...`)

## Error handling
- **Search timeout**: show error + suggest narrower query
- **Action failure**: show error + retry option
- **Permission denied**: show clear error message
- **Rate limit exceeded**: show error + wait message

## Success metrics
- **Search response time**: < 2s p95
- **Page load time**: < 1s p95 for detail pages
- **Action completion time**: < 3s p95 for common actions
- **Audit log completeness**: 100% of admin actions logged
