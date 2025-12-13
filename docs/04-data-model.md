# Data Model (Conceptual)

This is a conceptual model intended to guide implementation and API contracts. It focuses on MVP entities and relationships.

## High-level relationships
```
OwnerAccount 1—N Game
OwnerAccount 1—N CameraSource
OwnerAccount 1—N OwnerUser
Game 1—N Purchase
Purchase 1—1 Entitlement
Entitlement 1—N PlaybackSession
Purchase 0—N Refund
Purchase 0—N PaymentAttempt
OwnerAccount 1—N LedgerEntry
OwnerAccount 0—N Payout
Game 0—N SMSMessage (inbound/outbound)
```

## Entities

### OwnerAccount
- **Fields**: `id`, `type` (owner|association), `name`, `status` (active|suspended|pending_verification), `contactEmail`, `payoutProviderRef` (Stripe Connect account ID), `createdAt`, `updatedAt`
- **Notes**:
  - Status supports: `active`, `suspended`, `pending_verification`
  - `payoutProviderRef` is required before first game creation

### OwnerUser
- **Fields**: `id`, `ownerAccountId`, `email`, `role` (owner_admin|association_admin|association_operator), `mfaEnabled`, `status` (active|suspended), `createdAt`, `lastLoginAt`
- **Notes**:
  - `association_operator` role is optional MVP (can be Post-MVP)

### CameraSource
- **Fields**: `id`, `ownerAccountId`, `type` (veo|pixellot|rtmp), `configRef` (encrypted credentials/config), `status` (active|inactive), `createdAt`
- **Notes**:
  - Sensitive credentials should be stored encrypted and access-limited
  - `configRef` may point to encrypted storage or secrets manager

### Game
- **Fields**: `id`, `ownerAccountId`, `title`, `homeTeam`, `awayTeam`, `startsAt`, `endsAt` (optional), `state` (draft|active|live|ended|cancelled), `priceCents`, `currency` (default: USD)
- **Keyword**: `keywordCode` (unique globally or per-owner; MVP default: globally), `keywordStatus` (active|disabled|rotated)
- **Streaming**: `streamRef` (provider stream ID), `ingestProvider`, `playbackProvider`, `ingestUrl` (RTMP), `playbackUrl` (HLS manifest)
- **Timestamps**: `createdAt`, `updatedAt`, `cancelledAt` (if cancelled)

### ViewerIdentity
- **Fields**: `id`, `phoneE164` (normalized, optional), `email` (**required**), `smsOptOut` (bool), `optOutAt` (timestamp), `createdAt`, `lastSeenAt`
- **Notes**:
  - Viewer is primarily identified by **email address** (required at checkout)
  - Phone number is optional (used for SMS delivery)
  - `email` must be unique (or allow multiple entries per email; implementation choice)
  - `smsOptOut` must be respected for all outbound marketing messages
  - Email is used for monitoring "who purchased" and "who watched" queries

### Purchase
- **Fields**: `id`, `gameId`, `viewerId` (links to ViewerIdentity), `amountCents`, `currency`, `platformFeeCents`, `processorFeeCents`, `ownerNetCents`, `status` (created|paid|failed|refunded|partially_refunded)
- **Refs**: `paymentProviderPaymentId` (Square payment ID), `paymentProviderCustomerId` (optional)
- **Timestamps**: `createdAt`, `paidAt`, `failedAt`, `refundedAt`
- **Notes**:
  - `viewerId` links to ViewerIdentity (email required) for monitoring queries
  - Relationship: Purchase → ViewerIdentity enables "who purchased" queries

### PaymentAttempt
- **Fields**: `id`, `purchaseId`, `status` (created|succeeded|failed), `failureReason` (optional), `providerResponse` (JSON), `createdAt`, `completedAt`
- **Notes**:
  - Tracks individual payment attempts (retries create new attempts)
  - `providerResponse` stores provider-specific response for debugging

### Entitlement
- **Fields**: `id`, `purchaseId`, `tokenId` (hash of token claims for lookup), `validFrom`, `validTo`, `status` (active|expired|revoked), `createdAt`, `revokedAt` (if revoked)
- **Notes**:
  - Token must be signed/verified; store `tokenId` and claims, not raw secrets
  - `validTo` should extend beyond game end time (configurable grace period)

### PlaybackSession
- **Fields**: `id`, `entitlementId` (links to Entitlement→Purchase→ViewerIdentity), `startedAt`, `endedAt`, `deviceHash` (optional, hashed device fingerprint), `ipHash` (optional, hashed IP), `userAgent`, `state` (started|ended|error)
- **Telemetry summary**:
  - `totalWatchMs` (milliseconds)
  - `totalBufferMs` (milliseconds)
  - `bufferEvents` (count)
  - `fatalErrors` (count)
  - `startupLatencyMs` (milliseconds)
- **Notes**:
  - Telemetry summary is computed from client events and stored on session end
  - Multiple sessions per entitlement are allowed (device switching)
  - Relationship: PlaybackSession → Entitlement → Purchase → ViewerIdentity enables "who watched" queries
  - Session creation must link to ViewerIdentity for monitoring

### Refund
- **Fields**: `id`, `purchaseId`, `amountCents`, `reasonCode` (buffer_ratio_high|buffer_ratio_medium|excessive_buffering|fatal_error|manual), `issuedBy` (auto|admin|superadmin), `ruleVersion` (refund rule version applied), `telemetrySummary` (JSON snapshot), `createdAt`, `processedAt`
- **Notes**:
  - `reasonCode` should align to refund rules doc
  - `telemetrySummary` stores input telemetry used for decision (for auditability)
  - `ruleVersion` enables rule changes without breaking audit trail

### LedgerEntry
- **Fields**: `id`, `ownerAccountId`, `type` (charge|platform_fee|processor_fee|refund|payout), `amountCents` (positive for credits, negative for debits), `currency`, `referenceType` (purchase|refund|payout), `referenceId`, `description`, `createdAt`
- **Notes**:
  - Immutable accounting record
  - All monetary events (charges, fees, refunds, payouts) create ledger entries
  - Used for owner dashboard calculations and payout reconciliation

### Payout
- **Fields**: `id`, `ownerAccountId`, `amountCents`, `currency`, `status` (pending|processing|completed|failed), `payoutProviderRef` (Stripe transfer ID), `ledgerEntryIds` (array), `createdAt`, `processedAt`, `completedAt`
- **Notes**:
  - Represents a transfer to owner's Stripe Connect account
  - `ledgerEntryIds` links to ledger entries included in this payout
  - Payouts are batched (e.g., weekly) or on-demand (configurable)

### SMSMessage
- **Fields**: `id`, `direction` (inbound|outbound), `phoneE164`, `keywordCode` (if inbound), `gameId` (if applicable), `messageBody`, `status` (sent|delivered|failed), `providerMessageId`, `createdAt`, `deliveredAt`
- **Notes**:
  - Tracks all SMS for audit trail and support
  - `providerMessageId` is Twilio message SID or similar

### AdminAuditLog
- **Fields**: `id`, `adminUserId`, `actionType` (refund_create|resend_sms|keyword_disable|owner_suspend|config_update|...), `targetType` (purchase|game|owner|config), `targetId`, `reason` (optional), `requestMetadata` (JSON snapshot, redacted), `createdAt`
- **Notes**:
  - Immutable, append-only
  - `requestMetadata` should include IP, user agent, but redact sensitive data

## Identifiers and constraints
- **Keyword codes**: must be unique globally (MVP default) or per-owner (configurable). Collision handling: auto-suggest alternative.
- **Monetary values**: all stored in integer cents (avoid floating-point).
- **Phone numbers**: normalized to E.164 format (e.g., `+15551234567`). Optional.
- **Email addresses**: required for ViewerIdentity. Normalized (lowercase, trimmed). Used for monitoring queries.
- **Timestamps**: UTC, ISO 8601 format.
- **Token security**: entitlement tokens are signed JWTs or similar; do not store raw tokens, only `tokenId` hash for lookup.
- **Email masking**: Store full email in database; display masked email (e.g., `j***@example.com`) to owners. SuperAdmin can view full email.

## Indexing recommendations
- `Game.keywordCode` (unique index)
- `Purchase.gameId`, `Purchase.viewerId`, `Purchase.status`
- `Entitlement.purchaseId`, `Entitlement.tokenId`
- `PlaybackSession.entitlementId`
- `LedgerEntry.ownerAccountId`, `LedgerEntry.referenceType`, `LedgerEntry.referenceId`
- `SMSMessage.phoneE164`, `SMSMessage.keywordCode`
- `AdminAuditLog.adminUserId`, `AdminAuditLog.targetType`, `AdminAuditLog.targetId`
- `ViewerIdentity.email` (indexed for search and monitoring queries)
- `ViewerIdentity.phoneE164` (indexed if phone provided)

## Monitoring Query Patterns

The data model supports these monitoring queries:

1. **"Who purchased a game?"**
   - Query: `Purchase` WHERE `gameId = X` JOIN `ViewerIdentity` ON `Purchase.viewerId = ViewerIdentity.id`
   - Returns: List of purchasers with email (masked for owners, full for SuperAdmin)

2. **"Who watched a game?"**
   - Query: `PlaybackSession` JOIN `Entitlement` ON `PlaybackSession.entitlementId = Entitlement.id` JOIN `Purchase` ON `Entitlement.purchaseId = Purchase.id` JOIN `ViewerIdentity` ON `Purchase.viewerId = ViewerIdentity.id` WHERE `Purchase.gameId = X`
   - Returns: List of watchers with session counts, last watched timestamp

3. **"Who watched a specific purchase?"**
   - Query: `PlaybackSession` WHERE `entitlementId` IN (SELECT `id` FROM `Entitlement` WHERE `purchaseId = X`) JOIN `Entitlement` → `Purchase` → `ViewerIdentity`
   - Returns: Viewer identity + session details for that purchase

