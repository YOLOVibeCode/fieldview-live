# Architecture Checklist: Stream-Page Decoupling

**Goal:** Make streams completely independent from pages for fault-tolerance.

---

## Current State Analysis

### Coupling Points Identified

| Coupling | Location | Issue |
|----------|----------|-------|
| `DirectStream.streamUrl` | Prisma schema | Stream URL stored directly on page entity |
| Bootstrap endpoint | `/api/direct/:slug/bootstrap` | Combines page config + stream URL in single response |
| Frontend init | `DirectStreamPageBase.tsx:352-358` | Page shows "offline" if `streamUrl` is null |
| Single failure mode | Entire system | If stream URL invalid, page becomes unusable |

### Current Data Flow

```
┌─────────────┐     ┌───────────────────┐     ┌─────────────┐
│   Page      │────▶│   Bootstrap API   │────▶│   Player    │
│ /direct/foo │     │ (returns streamUrl│     │ (requires   │
│             │     │  bundled w/ page) │     │  streamUrl) │
└─────────────┘     └───────────────────┘     └─────────────┘
                              │
                              ▼
                    If streamUrl null → "offline"
```

---

## Recommended Architecture: Stream as First-Class Entity

### Principle: Separate Concerns

1. **Page** = venue configuration (title, paywall, chat, scoreboard settings)
2. **Stream** = media source configuration (URL, health, fallbacks, status)
3. **Binding** = optional many-to-many relationship

### Proposed Data Model

```prisma
model Stream {
  id              String   @id @default(uuid()) @db.Uuid
  name            String   // Human-readable name
  
  // Primary source
  primaryUrl      String?  // HLS manifest URL
  primaryType     String   @default("hls") // hls | rtmp | embed
  primaryStatus   String   @default("unknown") // live | offline | unknown | error
  primaryLastCheck DateTime?
  
  // Fallback source (fault-tolerance)
  fallbackUrl     String?
  fallbackType    String?
  
  // Health monitoring
  healthCheckUrl  String?  // URL to probe for stream health
  healthCheckInterval Int  @default(30) // seconds
  lastHealthCheck DateTime?
  healthStatus    String   @default("unknown") // healthy | degraded | down | unknown
  
  // Metadata
  ownerAccountId  String   @db.Uuid
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  ownerAccount    OwnerAccount @relation(fields: [ownerAccountId], references: [id])
  pageBindings    StreamPageBinding[]
  
  @@index([ownerAccountId])
  @@index([primaryStatus])
}

model StreamPageBinding {
  id             String   @id @default(uuid()) @db.Uuid
  streamId       String   @db.Uuid
  directStreamId String   @db.Uuid
  priority       Int      @default(0) // For multiple streams per page
  
  stream         Stream       @relation(fields: [streamId], references: [id], onDelete: Cascade)
  directStream   DirectStream @relation(fields: [directStreamId], references: [id], onDelete: Cascade)
  
  @@unique([streamId, directStreamId])
  @@index([directStreamId])
}
```

---

## Fault-Tolerance Patterns

### 1. Stream Health Service (Backend)

```typescript
interface IStreamHealthService {
  checkHealth(streamId: string): Promise<StreamHealthResult>;
  getActiveStream(pageId: string): Promise<Stream | null>;
}

interface StreamHealthResult {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latencyMs?: number;
  errorMessage?: string;
  checkedAt: Date;
}
```

**Behavior:**
- Periodic health checks (configurable interval)
- Auto-failover to fallback URL when primary fails
- Exponential backoff on repeated failures
- Emit events on status changes (for alerts)

### 2. Bootstrap Response: Decouple Page & Stream

```typescript
// BEFORE (coupled)
interface BootstrapResponse {
  slug: string;
  title: string;
  streamUrl: string | null;  // ❌ Stream embedded in page
  chatEnabled: boolean;
  // ...
}

// AFTER (decoupled)
interface BootstrapResponse {
  page: {
    slug: string;
    title: string;
    chatEnabled: boolean;
    scoreboardEnabled: boolean;
    // ... page-only config
  };
  stream: {
    status: 'live' | 'offline' | 'scheduled' | 'unknown';
    url: string | null;
    fallbackUrl: string | null;
    type: 'hls' | 'rtmp' | 'embed';
    healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown';
  } | null;  // ✅ Stream is separate, can be null
}
```

### 3. Frontend: Graceful Degradation

```tsx
// Current (brittle)
if (!bootstrap.streamUrl) {
  setStatus('offline');  // ❌ Entire page unusable
}

// Proposed (resilient)
if (!bootstrap.stream || bootstrap.stream.status !== 'live') {
  // ✅ Page still functional
  showStreamPlaceholder({
    status: bootstrap.stream?.status || 'offline',
    message: getStatusMessage(bootstrap.stream),
    retryIn: bootstrap.stream?.nextHealthCheck,
  });
  
  // ✅ Other features still work
  enableChat();
  enableScoreboard();
}
```

### 4. Auto-Retry with Exponential Backoff

```typescript
const RETRY_CONFIG = {
  initialDelayMs: 5000,
  maxDelayMs: 60000,
  maxRetries: 10,
  backoffMultiplier: 1.5,
};

interface StreamRetryState {
  attempt: number;
  nextRetryAt: Date;
  lastError: string | null;
}
```

**Frontend Behavior:**
1. Show "Stream starting soon..." with countdown
2. Auto-poll stream status endpoint
3. Exponential backoff on failures
4. Manual "Try Again" button always available

### 5. Stream Status Endpoint (New)

```
GET /api/streams/:streamId/status
```

**Response:**
```json
{
  "id": "uuid",
  "status": "live",
  "url": "https://...",
  "health": "healthy",
  "lastChecked": "2026-01-21T...",
  "fallbackAvailable": true
}
```

**Use Case:** Frontend polls this independently of bootstrap. Page loads fast, stream status loads async.

---

## Migration Strategy

### Phase 1: Add Stream Entity (Non-Breaking)
- [ ] Create `Stream` and `StreamPageBinding` models
- [ ] Add migration script to create `Stream` records from existing `DirectStream.streamUrl`
- [ ] Keep `DirectStream.streamUrl` as deprecated fallback

### Phase 2: Update Backend
- [ ] Create `IStreamReader` and `IStreamWriter` interfaces
- [ ] Create `StreamHealthService` with health check job
- [ ] Update bootstrap endpoint to return decoupled structure
- [ ] Add `/api/streams/:id/status` endpoint

### Phase 3: Update Frontend
- [ ] Update `DirectStreamPageBase` to use new bootstrap structure
- [ ] Add `useStreamStatus` hook for polling
- [ ] Implement graceful degradation UI
- [ ] Add retry logic with exponential backoff

### Phase 4: Deprecate Old Pattern
- [ ] Remove `DirectStream.streamUrl` field
- [ ] Remove inline stream URL from bootstrap
- [ ] Update admin UI to manage streams separately

---

## Fault-Tolerance Checklist

| Scenario | Current Behavior | Target Behavior |
|----------|-----------------|-----------------|
| Stream URL is null | Page shows "offline" | Page loads, shows "No stream configured" |
| Stream URL is invalid | Player fails silently | Player shows error, retries, tries fallback |
| Stream goes down mid-session | Player shows error | Auto-failover to fallback, then retry primary |
| API returns 500 | Page shows "offline" | Page loads from cache, polls for recovery |
| Network timeout on bootstrap | Page shows "offline" | Retry with backoff, show "Connecting..." |
| Mux CDN has issues | Viewer sees buffering | Fallback to backup CDN or show quality selector |

---

## Optional Enhancements

### A. Stream CDN Failover
- Primary: Mux
- Fallback: Cloudflare Stream or self-hosted
- Automatic failover based on health checks

### B. Stream Caching
- Cache last-known-good stream URL in Redis
- Serve cached URL if DB is slow/down
- TTL-based invalidation

### C. Client-Side Stream Discovery
- Frontend tries multiple URLs in parallel
- First successful connection wins
- Report failures to backend for analytics

### D. WebSocket Stream Status
- Real-time push of stream status changes
- Eliminates polling overhead
- Instant failover notifications

---

## Decision Points (Require Discussion)

1. **How long to retry before giving up?** (Recommend: 5 minutes with backoff)
2. **Should fallback be automatic or manual?** (Recommend: Auto with user notification)
3. **Store stream history for analytics?** (Recommend: Yes, helps debug issues)
4. **Allow multiple active streams per page?** (Recommend: Yes, for multi-angle support)

---

## Summary

**Key Principle:** A page is a venue. A stream is a media source. They should be independent.

**Benefits:**
- Page loads fast even if stream is down
- Chat, scoreboard, paywall work independently
- Auto-failover improves reliability
- Easier to debug (stream health vs page issues)
- Enables future features (multi-stream, DVR, etc.)

---

`ROLE: architect STRICT=true`

*This document is a recommendation. Implementation requires switching to ENGINEER role.*
