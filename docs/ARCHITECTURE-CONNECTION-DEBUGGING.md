# Architecture: Connection Debugging & Observability

**Date**: January 21, 2026  
**Author**: Software Architect  
**Status**: PROPOSED  
**Priority**: HIGH - Critical for production triage

---

## 1. Problem Statement

When users experience connection issues on the DirectStream page, support/engineering needs comprehensive debugging information to triage problems quickly. Current state:

### ✅ What We Have
- `ChatDebugPanel` - Covers chat/viewer registration only
- Console logs scattered across components (54+ in DirectStreamPageBase)
- Basic error states displayed on UI

### ❌ What We're Missing
1. **Stream Player Debugging** - HLS connection states, buffering, errors
2. **API Health Dashboard** - Bootstrap, settings, scoreboard endpoints
3. **Real-time Connection Indicators** - WebSocket/SSE status at a glance
4. **Performance Metrics** - Time-to-first-frame, API latency
5. **Network Diagnostics** - Request/response logging
6. **Unified Debug Panel** - Single panel for all connection types
7. **Export Capability** - Download debug report for support tickets

---

## 2. Proposed Architecture

### 2.1 Connection Debug Panel (Unified)

Replace/extend `ChatDebugPanel` with a comprehensive `ConnectionDebugPanel`:

```
┌─────────────────────────────────────────────────────────────────┐
│  🔧 Connection Diagnostics                        [Export] [×]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ 📡 Stream    │ │ 🔌 API      │ │ 💬 Chat     │            │
│  │ ● PLAYING    │ │ ● HEALTHY   │ │ ● CONNECTED │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  [Stream] [API] [Chat] [Network] [Metrics]  ← Tab Navigation   │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  STREAM TAB:                                                    │
│  ├─ Player State: PLAYING                                       │
│  ├─ HLS Version: 1.5.12                                         │
│  ├─ Stream URL: https://stream.mux.com/...                      │
│  ├─ Current Level: 1080p @ 4.2 Mbps                             │
│  ├─ Buffer Length: 12.4s                                        │
│  ├─ Dropped Frames: 0                                           │
│  ├─ Time-to-First-Frame: 1.2s                                   │
│  └─ Last Error: None                                            │
│                                                                 │
│  API TAB:                                                       │
│  ├─ Bootstrap: ✅ 200 OK (142ms)                                │
│  ├─ Settings: ✅ 200 OK (89ms)                                  │
│  ├─ Scoreboard: ⚠️ 404 (not configured)                        │
│  └─ Viewers: ✅ 200 OK (67ms)                                   │
│                                                                 │
│  CHAT TAB:                                                      │
│  ├─ Transport: SSE                                              │
│  ├─ Connected: ✅ Yes                                           │
│  ├─ Game ID: abc-123-def                                        │
│  ├─ Messages: 42                                                │
│  └─ Last Heartbeat: 2s ago                                      │
│                                                                 │
│  NETWORK TAB:                                                   │
│  ├─ Recent Requests (last 20)                                   │
│  │   GET /api/direct/tchs/bootstrap       200  142ms            │
│  │   GET /api/public/scoreboard/tchs      404   45ms            │
│  │   SSE /api/public/games/.../chat       OPEN  -               │
│  └─ Failed Requests: 0                                          │
│                                                                 │
│  METRICS TAB:                                                   │
│  ├─ Page Load: 1.8s                                             │
│  ├─ Bootstrap Fetch: 142ms                                      │
│  ├─ Stream Connect: 1.2s                                        │
│  ├─ Chat Connect: 340ms                                         │
│  └─ Total Active Time: 5m 32s                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Connection State Machine

Each connection type follows a state machine for consistent tracking:

```typescript
type ConnectionState = 
  | 'idle'       // Not started
  | 'connecting' // In progress
  | 'connected'  // Success
  | 'error'      // Failed (with error details)
  | 'retrying'   // Reconnecting after failure
  | 'disconnected'; // Intentionally closed

interface ConnectionInfo {
  type: 'stream' | 'api' | 'chat' | 'scoreboard' | 'viewers';
  state: ConnectionState;
  connectedAt?: Date;
  lastError?: {
    code: string;
    message: string;
    timestamp: Date;
    recoverable: boolean;
  };
  metrics: {
    connectTime?: number;  // ms to connect
    latency?: number;      // avg response time
    retryCount: number;
  };
}
```

### 2.3 Stream Player Debug Info

HLS.js provides rich debugging data. Expose it:

```typescript
interface StreamDebugInfo {
  // Player State
  playerState: 'loading' | 'buffering' | 'playing' | 'paused' | 'error' | 'ended';
  
  // HLS Specific
  hlsVersion: string;
  isLive: boolean;
  
  // Quality
  currentLevel: number;
  currentBitrate: number;
  availableLevels: { resolution: string; bitrate: number }[];
  autoLevelEnabled: boolean;
  
  // Buffer
  bufferLength: number;  // seconds
  backBufferLength: number;
  
  // Performance
  droppedFrames: number;
  totalFrames: number;
  timeToFirstFrame: number;
  
  // Network
  streamUrl: string;
  lastSegmentLoadTime: number;
  bandwidth: number;  // estimated
  
  // Errors
  lastError?: {
    type: 'network' | 'media' | 'mux' | 'other';
    fatal: boolean;
    details: string;
    timestamp: Date;
  };
  errorHistory: Array<{
    type: string;
    message: string;
    timestamp: Date;
  }>;
}
```

### 2.4 API Health Monitor

Track all API endpoints with timing:

```typescript
interface ApiHealthInfo {
  endpoints: {
    bootstrap: EndpointHealth;
    settings: EndpointHealth;
    scoreboard: EndpointHealth;
    viewers: EndpointHealth;
    chat: EndpointHealth;
    unlock: EndpointHealth;
  };
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
}

interface EndpointHealth {
  url: string;
  lastStatus: number;
  lastLatency: number;
  lastChecked: Date;
  errorRate: number;  // % of failed requests
  avgLatency: number;
  isHealthy: boolean;
}
```

### 2.5 Network Request Logger

Capture all relevant network requests:

```typescript
interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  type: 'xhr' | 'fetch' | 'sse' | 'websocket';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status?: number;
  statusText?: string;
  requestHeaders: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: unknown;
  responseBody?: unknown;
  error?: string;
}

// Keep last 50 requests in memory
const networkLog: NetworkRequest[] = [];
```

---

## 3. UI/UX Design

### 3.1 Access Methods

| Method | When | Who |
|--------|------|-----|
| `?debug=true` URL param | Production debugging | Support/Engineering |
| `localhost` | Development | Engineers |
| Keyboard shortcut `Ctrl+Shift+D` | Quick access | Anyone who knows |
| Footer link (if admin) | Admin access | Stream admins |

### 3.2 Status Indicators (Always Visible)

Small, non-intrusive indicators in corner when issues detected:

```
┌─────────────────────────────────────────┐
│  [Page Content]                         │
│                                         │
│                          ┌─────────────┐│
│                          │ 📡⚠️ 💬✅   ││
│                          └─────────────┘│
└─────────────────────────────────────────┘

Legend:
  📡✅ = Stream healthy
  📡⚠️ = Stream buffering/retrying
  📡❌ = Stream error
  💬✅ = Chat connected
  💬❌ = Chat disconnected
```

### 3.3 Export Debug Report

One-click export for support tickets:

```json
{
  "reportVersion": "1.0",
  "generatedAt": "2026-01-21T03:30:00Z",
  "pageUrl": "https://fieldview.live/direct/tchs/soccer-20260120-varsity",
  
  "browser": {
    "userAgent": "Mozilla/5.0...",
    "platform": "MacOS",
    "screenSize": "1920x1080"
  },
  
  "stream": {
    "state": "playing",
    "url": "https://stream.mux.com/...",
    "timeToFirstFrame": 1200,
    "bufferLength": 12.4,
    "droppedFrames": 0,
    "errors": []
  },
  
  "api": {
    "bootstrap": { "status": 200, "latency": 142 },
    "scoreboard": { "status": 404, "latency": 45 }
  },
  
  "chat": {
    "connected": true,
    "transport": "sse",
    "messageCount": 42
  },
  
  "networkLog": [
    { "url": "/api/direct/tchs/bootstrap", "status": 200, "duration": 142 }
  ],
  
  "consoleErrors": [
    // Captured console.error calls
  ]
}
```

---

## 4. Implementation Phases

### Phase 1: Foundation (Priority: HIGH)
- [ ] Create `useConnectionDebug` hook to aggregate all connection states
- [ ] Create `ConnectionDebugContext` for global state
- [ ] Add stream debug info extraction from HLS.js
- [ ] Extend existing `ChatDebugPanel` → `ConnectionDebugPanel`

### Phase 2: API Health (Priority: HIGH)
- [ ] Implement API health tracking
- [ ] Add request/response interceptor for fetch calls
- [ ] Track latency metrics
- [ ] Display API health in debug panel

### Phase 3: Network Logging (Priority: MEDIUM)
- [ ] Implement network request logger
- [ ] Capture headers and bodies (sanitize sensitive data)
- [ ] Add filtering by type (api, stream, chat)
- [ ] Display in Network tab

### Phase 4: Export & Polish (Priority: MEDIUM)
- [ ] Implement debug report export
- [ ] Add keyboard shortcut
- [ ] Add mini status indicators
- [ ] Performance optimization (don't impact main thread)

### Phase 5: Production Monitoring (Priority: LOW)
- [ ] Optional integration with error reporting (Sentry)
- [ ] Aggregate metrics for dashboards
- [ ] Automated alerting on error patterns

---

## 5. Component Structure

```
apps/web/
├── components/
│   └── debug/
│       ├── ConnectionDebugPanel.tsx      # Main debug panel
│       ├── StreamDebugTab.tsx            # HLS player debug
│       ├── ApiDebugTab.tsx               # API health
│       ├── ChatDebugTab.tsx              # Chat/SSE debug
│       ├── NetworkDebugTab.tsx           # Request log
│       ├── MetricsDebugTab.tsx           # Performance
│       └── DebugStatusIndicators.tsx     # Mini indicators
│
├── hooks/
│   ├── useConnectionDebug.ts             # Aggregates all debug state
│   ├── useStreamDebug.ts                 # HLS.js debug extraction
│   ├── useApiHealth.ts                   # API endpoint tracking
│   └── useNetworkLog.ts                  # Request logging
│
└── lib/
    └── debug/
        ├── ConnectionDebugContext.tsx    # Global debug state
        ├── networkInterceptor.ts         # Fetch/XHR wrapper
        ├── reportExporter.ts             # Debug report generator
        └── types.ts                      # Debug type definitions
```

---

## 6. Console Log Strategy

### Current State
- 54+ console.log calls in DirectStreamPageBase
- 29+ in AdminPanel
- Inconsistent formatting

### Proposed Standard

```typescript
// Namespace prefixes for easy filtering
const LOG_PREFIXES = {
  stream: '[Stream]',
  api: '[API]',
  chat: '[Chat]',
  auth: '[Auth]',
  scoreboard: '[Scoreboard]',
  admin: '[Admin]',
  debug: '[Debug]',
};

// Log levels with emojis for visual scanning
// ✅ Success
// ⏳ In progress
// ⚠️ Warning (non-fatal)
// ❌ Error (fatal)
// 📡 Network
// 🔐 Auth
// 📊 Metrics

// Example usage
console.log('[Stream] ✅ MANIFEST_PARSED', { levels: 5, firstLevel: 2 });
console.log('[API] 📡 Bootstrap fetched in 142ms');
console.warn('[Chat] ⚠️ Connection lost, retrying...');
console.error('[Stream] ❌ Fatal error:', errorDetails);
```

### Console Capture for Export

```typescript
// Intercept console.error for debug report
const originalError = console.error;
const capturedErrors: string[] = [];

console.error = (...args) => {
  capturedErrors.push(args.map(a => String(a)).join(' '));
  originalError.apply(console, args);
};
```

---

## 7. Data Testid Attributes

All debug panel elements must have `data-testid` for automation:

| Element | data-testid |
|---------|-------------|
| Debug Panel | `debug-panel` |
| Toggle Button | `btn-debug-toggle` |
| Stream Tab | `debug-tab-stream` |
| API Tab | `debug-tab-api` |
| Chat Tab | `debug-tab-chat` |
| Network Tab | `debug-tab-network` |
| Metrics Tab | `debug-tab-metrics` |
| Export Button | `btn-export-debug` |
| Status Indicator (Stream) | `debug-status-stream` |
| Status Indicator (Chat) | `debug-status-chat` |
| Run Diagnostics | `btn-run-diagnostics` |
| Clear Identity | `btn-clear-identity` |

---

## 8. Security Considerations

### What to NEVER log/export:
- Passwords
- JWT tokens (show only `[REDACTED]` or last 4 chars)
- Full credit card info
- Session secrets

### What to sanitize:
- Email addresses (show partial: `j***@example.com`)
- API keys (show only prefix)
- Personal names (optional redaction)

```typescript
function sanitizeForExport(data: unknown): unknown {
  // Recursive sanitization
  if (typeof data === 'string') {
    if (data.includes('@')) return sanitizeEmail(data);
    if (data.startsWith('ey')) return '[JWT_REDACTED]';
    if (data.length > 32) return data.slice(0, 8) + '...[TRUNCATED]';
  }
  // ... handle objects/arrays
}
```

---

## 9. Performance Impact

### Goals:
- Debug panel should NOT impact main thread
- Logging should be fire-and-forget
- Network interceptor should add <1ms overhead

### Strategies:
- Use `requestIdleCallback` for non-critical updates
- Limit network log to 50 entries (circular buffer)
- Lazy-load debug panel component
- Debounce rapid state updates

---

## 10. Success Criteria

| Metric | Target |
|--------|--------|
| Time to diagnose stream issue | < 2 minutes |
| Time to diagnose API issue | < 1 minute |
| Debug panel load time | < 100ms |
| Memory overhead | < 5MB |
| Support tickets with debug reports | > 80% |

---

## 11. Migration Plan

1. **Week 1**: Create hooks and context (foundation)
2. **Week 2**: Extend ChatDebugPanel → ConnectionDebugPanel
3. **Week 3**: Add stream and API tabs
4. **Week 4**: Add network logging and export
5. **Week 5**: Testing and polish

---

## 12. Appendix: Current Console Log Inventory

### DirectStreamPageBase.tsx (54 logs)
- Bootstrap lifecycle
- HLS player events
- Viewer identity
- Chat connection
- Admin panel

### AdminPanel.tsx (29 logs)
- Unlock flow
- Settings save
- Error states

### useGameChat.ts (5 logs)
- Connection events
- Message events

### SSEMessageTransport.ts (4 logs)
- SSE lifecycle

**Recommendation**: Keep existing logs, standardize format, add capture for export.

---

**ROLE: architect STRICT=true**

*This document outlines the architecture. Implementation requires switching to ENGINEER role.*
