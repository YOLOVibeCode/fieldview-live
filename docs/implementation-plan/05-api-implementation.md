# API Implementation (Express)

## Overview

Express API server implementing all functional requirements (FR-1 through FR-9) with strict TDD, ISP compliance, and 100% test coverage.

**Location**: `apps/api/`

**Architecture**: Repository pattern, service layer, ISP-compliant interfaces.

## Project Structure

```
apps/api/
├── src/
│   ├── routes/              # Express route handlers
│   │   ├── public.ts        # Public endpoints (checkout, watch)
│   │   ├── owners.ts        # Owner endpoints (games, analytics)
│   │   ├── admin.ts         # Admin endpoints (search, refunds)
│   │   └── webhooks.ts      # Webhook handlers (Twilio, Square)
│   ├── services/            # Business logic (ISP interfaces)
│   │   ├── GameService.ts
│   │   ├── PaymentService.ts
│   │   ├── EntitlementService.ts
│   │   ├── StreamingService.ts
│   │   ├── RefundService.ts
│   │   └── AudienceService.ts
│   ├── repositories/        # Data access (ISP interfaces)
│   │   ├── IGameRepository.ts
│   │   ├── IPurchaseRepository.ts
│   │   ├── IViewerIdentityRepository.ts
│   │   └── implementations/
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts          # JWT/session auth
│   │   ├── validation.ts    # Zod validation
│   │   ├── rateLimit.ts    # Rate limiting
│   │   └── audit.ts        # Admin audit logging
│   ├── webhooks/            # Webhook verification/handlers
│   │   ├── twilio.ts
│   │   └── square.ts
│   ├── lib/                 # Utilities
│   │   ├── logger.ts        # Pino logger
│   │   ├── errors.ts        # Error handling
│   │   └── idempotency.ts  # Idempotency keys
│   └── server.ts            # Express app setup
├── __tests__/
│   ├── unit/                # Unit tests (services, utils)
│   ├── integration/         # Integration tests (routes)
│   └── fixtures/            # Test fixtures
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Implementation Phases

### Phase 1: Foundation (Week 2-3)

**Tasks**:
1. Express server setup with health endpoint
2. Request validation middleware (Zod)
3. Error handling middleware
4. Logging (Pino)
5. Auth scaffolding (JWT for owners, session for admin)
6. Rate limiting middleware
7. Idempotency middleware

**Acceptance Criteria**:
- [ ] Health endpoint returns 200
- [ ] Validation middleware rejects invalid requests
- [ ] Errors return structured JSON responses
- [ ] Logging outputs structured JSON
- [ ] Auth middleware protects routes
- [ ] Rate limiting works
- [ ] 100% unit test coverage on middleware

### Phase 2: Owner Authentication & Square Onboarding (Week 3)

**Tasks**:
1. Owner registration endpoint (`POST /api/owners/register`)
2. Owner login endpoint (`POST /api/owners/login`)
3. Square Connect onboarding flow
   - Generate Square Connect URL
   - Handle Square callback
   - Store `payoutProviderRef` (Square account ID)

**ISP Interfaces**:
```typescript
// apps/api/src/repositories/IOwnerAccountRepository.ts
export interface IOwnerAccountReader {
  findById(id: string): Promise<OwnerAccount | null>;
  findByEmail(email: string): Promise<OwnerAccount | null>;
}

export interface IOwnerAccountWriter {
  create(data: CreateOwnerAccountData): Promise<OwnerAccount>;
  update(id: string, data: UpdateOwnerAccountData): Promise<OwnerAccount>;
}
```

**Acceptance Criteria**:
- [ ] Owner can register with email/password
- [ ] Owner can login and receive JWT token
- [ ] Square Connect onboarding flow completes
- [ ] `payoutProviderRef` stored in database
- [ ] 100% test coverage

### Phase 3: Game Management (FR-1) (Week 3-4)

**Tasks**:
1. Game CRUD endpoints:
   - `POST /api/owners/games` (create)
   - `GET /api/owners/games` (list)
   - `GET /api/owners/games/:id` (get)
   - `PATCH /api/owners/games/:id` (update)
   - `DELETE /api/owners/games/:id` (delete)
2. Keyword generation (unique, collision handling)
3. QR code generation
4. StreamSource attachment to Game

**ISP Interfaces**:
```typescript
// apps/api/src/services/IGameService.ts
export interface IGameReader {
  getById(id: string, ownerAccountId: string): Promise<Game>;
  listByOwner(ownerAccountId: string, filters?: GameFilters): Promise<Game[]>;
}

export interface IGameWriter {
  create(data: CreateGameData, ownerAccountId: string): Promise<Game>;
  update(id: string, data: UpdateGameData, ownerAccountId: string): Promise<Game>;
  delete(id: string, ownerAccountId: string): Promise<void>;
}

export interface IKeywordGenerator {
  generateUniqueKeyword(): Promise<string>;
}
```

**Acceptance Criteria**:
- [ ] Owner can create game with title, teams, price, start time
- [ ] Keyword auto-generated (unique, collision handled)
- [ ] QR code generated and stored
- [ ] StreamSource can be attached (Mux, BYO HLS, BYO RTMP, external embed)
- [ ] Owner can list/update/delete their games
- [ ] 100% test coverage

### Phase 4: SMS Inbound & Responses (FR-2) (Week 4)

**Tasks**:
1. Twilio webhook endpoint (`POST /api/webhooks/twilio`)
2. Keyword routing (lookup game by keyword)
3. Send payment link SMS
4. STOP/HELP compliance
5. SMS message logging

**ISP Interfaces**:
```typescript
// apps/api/src/services/ISmsService.ts
export interface ISmsReader {
  findByKeyword(keyword: string): Promise<Game | null>;
}

export interface ISmsWriter {
  sendPaymentLink(gameId: string, phoneE164: string): Promise<void>;
  handleStop(phoneE164: string): Promise<void>;
  handleHelp(phoneE164: string): Promise<void>;
}
```

**Acceptance Criteria**:
- [ ] Inbound SMS with keyword routes to correct game
- [ ] Payment link SMS sent successfully
- [ ] STOP opt-out handled immediately
- [ ] HELP response sent
- [ ] SMS messages logged
- [ ] Rate limiting applied (10 per phone per minute)
- [ ] 100% test coverage

### Phase 5: Checkout & Payments (FR-3) (Week 4-5)

**Tasks**:
1. Checkout endpoint (`POST /api/public/games/:gameId/checkout`)
   - **Requires `viewerEmail`** (per spec)
   - Creates `ViewerIdentity` if not exists
   - Creates `Purchase` record
   - Creates Square payment intent
2. Square payment webhook (`POST /api/webhooks/square`)
   - Handle `payment.created` / `payment.updated`
   - Update `Purchase.status`
   - Create `Entitlement` on successful payment
   - Create ledger entries
3. Marketplace split calculation

**ISP Interfaces**:
```typescript
// apps/api/src/services/IPaymentService.ts
export interface IPaymentReader {
  getPurchaseById(id: string): Promise<Purchase | null>;
}

export interface IPaymentWriter {
  createCheckout(gameId: string, viewerEmail: string, viewerPhone?: string): Promise<CheckoutResponse>;
  processSquareWebhook(event: SquareWebhookEvent): Promise<void>;
}
```

**Acceptance Criteria**:
- [ ] Checkout requires `viewerEmail`
- [ ] `ViewerIdentity` created/updated with email
- [ ] Square payment intent created
- [ ] Webhook updates purchase status
- [ ] Entitlement created on payment success
- [ ] Ledger entries created (charge, platform fee, processor fee)
- [ ] Marketplace split calculated correctly
- [ ] 100% test coverage

### Phase 6: Entitlements & Watch Bootstrap (FR-4) (Week 5)

**Tasks**:
1. Watch bootstrap endpoint (`GET /api/public/watch/:token`)
   - Validate entitlement token (signed, expiring)
   - Return watch bootstrap (stream URL, player config)
2. Session creation endpoint (`POST /api/public/watch/:token/sessions`)
   - Create `PlaybackSession` linked to `ViewerIdentity`
   - Return session ID
3. Token signing/verification

**ISP Interfaces**:
```typescript
// apps/api/src/services/IEntitlementService.ts
export interface IEntitlementReader {
  validateToken(token: string): Promise<EntitlementValidationResult>;
}

export interface IEntitlementWriter {
  createEntitlement(purchaseId: string): Promise<Entitlement>;
  createPlaybackSession(entitlementId: string, metadata: SessionMetadata): Promise<PlaybackSession>;
}
```

**Acceptance Criteria**:
- [ ] Entitlement token validates (signature, expiration)
- [ ] Watch bootstrap returns correct stream URL/config
- [ ] PlaybackSession created and linked to ViewerIdentity
- [ ] Token expiration enforced
- [ ] 100% test coverage

### Phase 7: Streaming Integration (Week 5-6)

**Tasks**:
1. Mux-managed stream creation
2. BYO RTMP: store publish URL, route to Mux
3. BYO HLS: store manifest URL, implement tokenized manifest endpoint
4. External embed: store embed URL, gate watch page

**ISP Interfaces**:
```typescript
// apps/api/src/services/IStreamingService.ts
export interface IStreamingReader {
  getStreamSource(gameId: string): Promise<StreamSource | null>;
}

export interface IStreamingWriter {
  createMuxStream(gameId: string): Promise<MuxStreamConfig>;
  configureByoHls(gameId: string, manifestUrl: string): Promise<void>;
  configureByoRtmp(gameId: string, publishUrl: string): Promise<RtmpConfig>;
  configureExternalEmbed(gameId: string, embedUrl: string, provider: string): Promise<void>;
}
```

**Acceptance Criteria**:
- [ ] Mux stream created and playback ID stored
- [ ] BYO RTMP publish URL stored, routes to Mux
- [ ] BYO HLS manifest URL stored, tokenized endpoint works
- [ ] External embed URL stored, watch page gated
- [ ] Protection level assigned correctly per stream type
- [ ] 100% test coverage

### Phase 8: Playback UI & Telemetry (FR-5, FR-6) (Week 6)

**Tasks**:
1. Telemetry submission endpoint (`POST /api/public/watch/:token/telemetry`)
2. Session end endpoint (`POST /api/public/watch/:token/sessions/:sessionId/end`)
   - Update `PlaybackSession` with telemetry summary
3. Telemetry aggregation logic

**ISP Interfaces**:
```typescript
// apps/api/src/services/ITelemetryService.ts
export interface ITelemetryWriter {
  submitTelemetry(sessionId: string, events: TelemetryEvent[]): Promise<void>;
  endSession(sessionId: string, summary: TelemetrySummary): Promise<void>;
}
```

**Acceptance Criteria**:
- [ ] Telemetry events accepted and stored
- [ ] Session end calculates summary (buffer ratio, downtime, errors)
- [ ] Telemetry linked to ViewerIdentity via session
- [ ] 100% test coverage

### Phase 9: Refunds (FR-7) (Week 7)

**Tasks**:
1. Refund evaluation job (BullMQ)
2. Deterministic refund calculator (per `docs/07-refund-and-quality-rules.md`)
3. Square refund API integration
4. SMS notification on refund

**ISP Interfaces**:
```typescript
// apps/api/src/services/IRefundService.ts
export interface IRefundReader {
  evaluateRefundEligibility(purchaseId: string): Promise<RefundEvaluation>;
}

export interface IRefundWriter {
  issueRefund(purchaseId: string, reasonCode: string, telemetrySummary: TelemetrySummary): Promise<Refund>;
  processSquareRefund(refundId: string): Promise<void>;
}
```

**Acceptance Criteria**:
- [ ] Refund evaluation runs on schedule (post-game)
- [ ] Refund rules applied deterministically
- [ ] Square refund created successfully
- [ ] Ledger entries created
- [ ] SMS notification sent
- [ ] 100% test coverage

### Phase 10: Owner Dashboard & Audience (FR-8) (Week 7-8)

**Tasks**:
1. Analytics endpoint (`GET /api/owners/me/analytics`)
2. Audience endpoint (`GET /api/owners/me/games/:gameId/audience`)
   - Returns purchasers and watchers
   - **Email masking** for owners
3. Revenue calculations

**ISP Interfaces**:
```typescript
// apps/api/src/services/IAudienceService.ts
export interface IAudienceReader {
  getGameAudience(gameId: string, ownerAccountId: string, maskEmails: boolean): Promise<GameAudience>;
  getOwnerAnalytics(ownerAccountId: string): Promise<OwnerAnalytics>;
}
```

**Acceptance Criteria**:
- [ ] Analytics endpoint returns revenue, purchase count, conversion rate
- [ ] Audience endpoint returns purchasers with masked emails
- [ ] Audience endpoint returns watchers with session counts
- [ ] Email masking works correctly (`j***@example.com`)
- [ ] 100% test coverage

### Phase 11: Admin Console (FR-9) (Week 8)

**Tasks**:
1. Admin login + MFA (TOTP)
2. Search endpoint (`GET /api/admin/search?q=email|phone|keyword`)
3. Purchase timeline endpoint (`GET /api/admin/purchases/:id`)
4. Game audience endpoint (`GET /api/admin/owners/:ownerId/games/:gameId/audience`)
   - **Full email visibility** for SuperAdmin
5. Audit logging middleware

**ISP Interfaces**:
```typescript
// apps/api/src/services/IAdminService.ts
export interface IAdminReader {
  search(query: string): Promise<SearchResults>;
  getPurchaseTimeline(purchaseId: string): Promise<PurchaseTimeline>;
  getGameAudience(gameId: string, ownerId: string): Promise<GameAudience>; // Full emails
}
```

**Acceptance Criteria**:
- [ ] Admin login requires MFA
- [ ] Search finds by email, phone, keyword
- [ ] Purchase timeline shows all events
- [ ] SuperAdmin sees full emails in audience
- [ ] SupportAdmin sees masked emails
- [ ] All admin actions logged to audit log
- [ ] 100% test coverage

## Testing Strategy

### Unit Tests
- Services (business logic)
- Utilities (fee calculator, masking)
- Middleware (auth, validation)

### Integration Tests
- Route handlers (Supertest)
- Database operations (test Postgres)
- Webhook handlers (mock Twilio/Square)

### Contract Tests
- Request/response shapes match OpenAPI spec

## Acceptance Criteria (Overall)

- [ ] All FR-1 through FR-9 implemented
- [ ] ISP interfaces defined and used
- [ ] 100% test coverage
- [ ] All endpoints match OpenAPI spec
- [ ] Error handling consistent
- [ ] Logging structured
- [ ] Rate limiting applied
- [ ] Auth/authorization enforced

## Next Steps

- Proceed to [06-web-implementation.md](./06-web-implementation.md) for Next.js frontend
