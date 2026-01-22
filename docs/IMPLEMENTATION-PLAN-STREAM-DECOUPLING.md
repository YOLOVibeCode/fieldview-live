# Implementation Plan: Stream-Page Decoupling

**Objective:** Remove all stream URL dependencies from page loading. Enable admin panel and all page features to work independently of stream availability.

**Status:** Ready for implementation  
**Estimated Complexity:** Medium (8-12 hours)  
**Breaking Changes:** None (backward compatible)

---

## Problem Summary

### Current Issues

1. **Page won't load if streamUrl is null** - Line 352-358 in `DirectStreamPageBase.tsx`
2. **Admin panel requires stream URL** - Can't edit settings if stream isn't configured
3. **Bootstrap response couples page + stream** - Single API call returns both, fails together
4. **No graceful degradation** - Shows "offline" instead of functional page with placeholder

### Current Data Flow (Brittle)

```
Bootstrap API (/api/direct/:slug/bootstrap)
  ↓
Returns { slug, title, streamUrl, chatEnabled, ... }
  ↓
Frontend checks: if (!streamUrl) → setStatus('offline')
  ↓
Entire page unusable (no chat, no scoreboard, no admin)
```

---

## Solution Architecture

### New Data Flow (Resilient)

```
Bootstrap API (/api/direct/:slug/bootstrap)
  ↓
Returns {
  page: { slug, title, chatEnabled, ... },
  stream: { status, url, type } | null
}
  ↓
Frontend: Page always loads
  ↓
If stream.status === 'live' → Show player
If stream.status === 'offline' → Show placeholder
If stream === null → Show "Configure Stream" card
  ↓
Admin, chat, scoreboard work independently
```

---

## Implementation Steps

### Phase 1: Backend - Decouple Bootstrap Response (Non-Breaking)

**Files to modify:**
- `apps/api/src/routes/direct.ts`
- `apps/api/src/routes/public.direct-stream-events.ts`
- `packages/data-model/src/schemas/directStream.ts`

#### Step 1.1: Create new Bootstrap schema

**File:** `packages/data-model/src/schemas/directStreamBootstrap.ts` (NEW)

```typescript
import { z } from 'zod';

// Separate page config from stream config
export const DirectStreamPageConfigSchema = z.object({
  slug: z.string(),
  title: z.string(),
  gameId: z.string().uuid().nullable(),
  chatEnabled: z.boolean(),
  scoreboardEnabled: z.boolean(),
  paywallEnabled: z.boolean(),
  priceInCents: z.number().int().min(0),
  paywallMessage: z.string().nullable(),
  allowSavePayment: z.boolean(),
  scoreboardHomeTeam: z.string().nullable(),
  scoreboardAwayTeam: z.string().nullable(),
  scoreboardHomeColor: z.string().nullable(),
  scoreboardAwayColor: z.string().nullable(),
  allowViewerScoreEdit: z.boolean(),
  allowViewerNameEdit: z.boolean(),
});

export const DirectStreamStreamConfigSchema = z.object({
  status: z.enum(['live', 'offline', 'scheduled', 'error']),
  url: z.string().url().nullable(),
  type: z.enum(['hls', 'rtmp', 'embed']).nullable(),
  errorMessage: z.string().nullable(),
});

export const DirectStreamBootstrapResponseSchema = z.object({
  page: DirectStreamPageConfigSchema,
  stream: DirectStreamStreamConfigSchema.nullable(),
});

export type DirectStreamPageConfig = z.infer<typeof DirectStreamPageConfigSchema>;
export type DirectStreamStreamConfig = z.infer<typeof DirectStreamStreamConfigSchema>;
export type DirectStreamBootstrapResponse = z.infer<typeof DirectStreamBootstrapResponseSchema>;
```

#### Step 1.2: Update bootstrap endpoint to return decoupled response

**File:** `apps/api/src/routes/direct.ts`

**Location:** Lines 163-181 (bootstrap response)

**Change:**

```typescript
// BEFORE (coupled)
return res.json({
  slug: directStream.slug,
  gameId: directStream.gameId,
  streamUrl: directStream.streamUrl,  // ❌ Couples stream to page
  chatEnabled: directStream.chatEnabled,
  title: directStream.title,
  // ... rest of fields
});

// AFTER (decoupled)
return res.json({
  page: {
    slug: directStream.slug,
    title: directStream.title,
    gameId: directStream.gameId,
    chatEnabled: directStream.chatEnabled,
    scoreboardEnabled: directStream.scoreboardEnabled,
    paywallEnabled: directStream.paywallEnabled,
    priceInCents: directStream.priceInCents,
    paywallMessage: directStream.paywallMessage,
    allowSavePayment: directStream.allowSavePayment,
    scoreboardHomeTeam: directStream.scoreboardHomeTeam,
    scoreboardAwayTeam: directStream.scoreboardAwayTeam,
    scoreboardHomeColor: directStream.scoreboardHomeColor,
    scoreboardAwayColor: directStream.scoreboardAwayColor,
    allowViewerScoreEdit: directStream.allowViewerScoreEdit,
    allowViewerNameEdit: directStream.allowViewerNameEdit,
  },
  stream: directStream.streamUrl ? {
    status: 'live',  // TODO: Add actual health check later
    url: directStream.streamUrl,
    type: 'hls',  // Default assumption
    errorMessage: null,
  } : null,
  
  // BACKWARD COMPATIBILITY: Keep flat fields for old clients
  slug: directStream.slug,
  gameId: directStream.gameId,
  streamUrl: directStream.streamUrl,
  chatEnabled: directStream.chatEnabled,
  title: directStream.title,
  paywallEnabled: directStream.paywallEnabled,
  priceInCents: directStream.priceInCents,
  paywallMessage: directStream.paywallMessage,
  allowSavePayment: directStream.allowSavePayment,
  scoreboardEnabled: directStream.scoreboardEnabled,
  scoreboardHomeTeam: directStream.scoreboardHomeTeam,
  scoreboardAwayTeam: directStream.scoreboardAwayTeam,
  scoreboardHomeColor: directStream.scoreboardHomeColor,
  scoreboardAwayColor: directStream.scoreboardAwayColor,
  allowViewerScoreEdit: directStream.allowViewerScoreEdit,
  allowViewerNameEdit: directStream.allowViewerNameEdit,
});
```

**Same change for:** `apps/api/src/routes/public.direct-stream-events.ts` (lines 51-69)

#### Step 1.3: Update settings endpoint to work without streamUrl

**File:** `apps/api/src/routes/direct.ts`

**Location:** Lines 256-388 (`POST /api/direct/:slug/settings`)

**Change:** Remove streamUrl validation that blocks updates

```typescript
// Current issue: If streamUrl is invalid, entire settings update fails
// Solution: Validate streamUrl separately, still save other settings

const updateData: any = {};

// Validate streamUrl separately (non-blocking)
if (body.streamUrl !== undefined) {
  if (body.streamUrl === null || body.streamUrl === '') {
    updateData.streamUrl = null;  // Allow clearing stream URL
  } else {
    try {
      new URL(body.streamUrl);  // Validate URL format
      updateData.streamUrl = body.streamUrl;
    } catch {
      // Log warning but don't fail entire update
      logger.warn({ slug, streamUrl: body.streamUrl }, 'Invalid stream URL format, skipping');
    }
  }
}

// Apply all other settings regardless of streamUrl validity
if (body.chatEnabled !== undefined) updateData.chatEnabled = body.chatEnabled;
if (body.paywallEnabled !== undefined) updateData.paywallEnabled = body.paywallEnabled;
// ... rest of settings
```

---

### Phase 2: Frontend - Graceful Degradation

**Files to modify:**
- `apps/web/components/DirectStreamPageBase.tsx`
- `apps/web/components/AdminPanel.tsx`
- `apps/web/lib/types/directStream.ts` (NEW)

#### Step 2.1: Create TypeScript types for new bootstrap

**File:** `apps/web/lib/types/directStream.ts` (NEW)

```typescript
export interface DirectStreamPageConfig {
  slug: string;
  title: string;
  gameId: string | null;
  chatEnabled: boolean;
  scoreboardEnabled: boolean;
  paywallEnabled: boolean;
  priceInCents: number;
  paywallMessage: string | null;
  allowSavePayment: boolean;
  scoreboardHomeTeam: string | null;
  scoreboardAwayTeam: string | null;
  scoreboardHomeColor: string | null;
  scoreboardAwayColor: string | null;
  allowViewerScoreEdit: boolean;
  allowViewerNameEdit: boolean;
}

export interface DirectStreamStreamConfig {
  status: 'live' | 'offline' | 'scheduled' | 'error';
  url: string | null;
  type: 'hls' | 'rtmp' | 'embed' | null;
  errorMessage: string | null;
}

export interface DirectStreamBootstrapResponse {
  page: DirectStreamPageConfig;
  stream: DirectStreamStreamConfig | null;
  
  // BACKWARD COMPATIBILITY: Flat fields for old code
  slug: string;
  gameId: string | null;
  streamUrl: string | null;
  chatEnabled: boolean;
  title: string;
  paywallEnabled: boolean;
  priceInCents: number;
  paywallMessage: string | null;
  allowSavePayment: boolean;
  scoreboardEnabled: boolean;
  scoreboardHomeTeam: string | null;
  scoreboardAwayTeam: string | null;
  scoreboardHomeColor: string | null;
  scoreboardAwayColor: string | null;
  allowViewerScoreEdit: boolean;
  allowViewerNameEdit: boolean;
}
```

#### Step 2.2: Update DirectStreamPageBase to handle new structure

**File:** `apps/web/components/DirectStreamPageBase.tsx`

**Location:** Lines 246-365 (Bootstrap loading effect)

**Changes:**

```typescript
// BEFORE (line 270)
.then((data: Bootstrap | null) => {
  if (!data) return;
  
  setBootstrap(data);
  config.onBootstrapLoaded?.(data);
  
  // ... paywall checks ...
  
  if (data.streamUrl) {  // ❌ Fails if null
    initPlayer(data.streamUrl);
  } else {
    setStatus('offline');  // ❌ Entire page offline
  }
})

// AFTER (decoupled)
.then((data: DirectStreamBootstrapResponse | null) => {
  if (!data) return;
  
  // Save page config
  setBootstrap({
    ...data.page,
    // Maintain backward compatibility with flat structure
    streamUrl: data.stream?.url || null,
  });
  config.onBootstrapLoaded?.(data.page);
  
  // ... paywall checks (unchanged) ...
  
  // Handle stream separately
  if (data.stream?.status === 'live' && data.stream?.url) {
    console.log('[DirectStream] ▶️ Stream is live, initializing player');
    initPlayer(data.stream.url);
  } else if (data.stream?.status === 'offline') {
    console.log('[DirectStream] 📡 Stream is offline');
    setStatus('offline');
    setStreamMessage('Stream is currently offline. Check back later.');
  } else if (data.stream?.status === 'scheduled') {
    console.log('[DirectStream] ⏰ Stream is scheduled');
    setStatus('offline');
    setStreamMessage('Stream starts soon. Stay tuned!');
  } else if (data.stream?.status === 'error') {
    console.log('[DirectStream] ❌ Stream error:', data.stream.errorMessage);
    setStatus('error');
    setStreamMessage(data.stream.errorMessage || 'Stream error');
  } else {
    // No stream configured
    console.log('[DirectStream] 🔧 No stream configured');
    setStatus('offline');
    setStreamMessage('No stream configured. Admin can set stream URL.');
  }
  
  // ✅ Page is fully loaded regardless of stream status
  setPageLoaded(true);
})
```

#### Step 2.3: Add stream placeholder component

**File:** `apps/web/components/DirectStreamPageBase.tsx`

**Add new state:**

```typescript
const [streamMessage, setStreamMessage] = useState<string>('');
const [pageLoaded, setPageLoaded] = useState(false);
```

**Add placeholder UI (replace player when stream unavailable):**

```tsx
{/* Stream Player or Placeholder */}
<div className="relative w-full h-full bg-black">
  {status === 'playing' && (
    <VideoPlayer
      ref={videoRef}
      className="w-full h-full object-contain"
      data-testid="video-player"
    />
  )}
  
  {(status === 'offline' || status === 'error') && pageLoaded && (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="text-center p-8 max-w-md" data-testid="stream-placeholder">
        <div className="mb-4">
          {status === 'offline' ? (
            <div className="w-20 h-20 mx-auto rounded-full bg-gray-800 flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-500" /* ... offline icon ... */ />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto rounded-full bg-red-900/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" /* ... error icon ... */ />
            </div>
          )}
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          {status === 'offline' ? 'Stream Offline' : 'Stream Error'}
        </h3>
        <p className="text-gray-400 mb-6">
          {streamMessage || 'Stream is currently unavailable'}
        </p>
        {isAdmin && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            data-testid="btn-configure-stream"
          >
            Configure Stream
          </button>
        )}
      </div>
    </div>
  )}
  
  {status === 'loading' && !pageLoaded && (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  )}
</div>
```

#### Step 2.4: Update AdminPanel to work without stream

**File:** `apps/web/components/AdminPanel.tsx`

**Location:** Lines 52, 135 (streamUrl handling)

**Changes:**

```typescript
// BEFORE (line 52)
const [streamUrl, setStreamUrl] = useState(initialSettings?.streamUrl || '');

// AFTER (handle null/undefined gracefully)
const [streamUrl, setStreamUrl] = useState(initialSettings?.streamUrl ?? '');

// Update save handler (line 135)
body: JSON.stringify({
  streamUrl: streamUrl.trim() || null,  // ✅ Allow empty string → null
  chatEnabled,
  paywallEnabled,
  // ... rest
}),
```

**Add helper text:**

```tsx
<Input
  id="streamUrl"
  value={streamUrl}
  onChange={(e) => setStreamUrl(e.target.value)}
  placeholder="https://stream.mux.com/..."
  disabled={isSaving}
  data-testid="input-stream-url"
/>
<p className="text-sm text-muted-foreground mt-1">
  Leave empty to disable stream. Page will still load for chat/scoreboard.
</p>
```

---

### Phase 3: Testing & Validation

#### Test Cases

| Test Case | Expected Behavior |
|-----------|-------------------|
| **New page, no stream configured** | Page loads, shows "Configure Stream" placeholder |
| **Admin sets stream URL** | Player initializes, shows live video |
| **Admin clears stream URL** | Player hides, shows placeholder, chat/scoreboard still work |
| **Invalid stream URL** | Shows error placeholder, admin can edit |
| **Bootstrap API fails** | Show retry UI, cache last known config |
| **Stream URL 404** | Player shows error, page stays functional |

#### Manual Testing Script

```bash
# 1. Test new page creation
curl http://localhost:4301/api/direct/test-stream-decoupling/bootstrap

# Expected: { page: {...}, stream: null }

# 2. Test admin panel unlock (no stream)
curl -X POST http://localhost:4301/api/direct/test-stream-decoupling/unlock-admin \
  -H "Content-Type: application/json" \
  -d '{"password": "admin2026"}'

# Expected: { token: "jwt..." }

# 3. Test settings update without stream
curl -X POST http://localhost:4301/api/direct/test-stream-decoupling/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "chatEnabled": true,
    "scoreboardEnabled": true,
    "paywallEnabled": false,
    "priceInCents": 0
  }'

# Expected: 200 OK, settings saved

# 4. Test adding stream URL
curl -X POST http://localhost:4301/api/direct/test-stream-decoupling/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "streamUrl": "https://stream.mux.com/test.m3u8",
    "chatEnabled": true
  }'

# Expected: 200 OK, stream URL saved

# 5. Test clearing stream URL
curl -X POST http://localhost:4301/api/direct/test-stream-decoupling/settings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "streamUrl": null,
    "chatEnabled": true
  }'

# Expected: 200 OK, stream URL cleared
```

#### E2E Test (Playwright)

**File:** `apps/web/__tests__/e2e/stream-decoupling.spec.ts` (NEW)

```typescript
import { test, expect } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4301';

test.describe('Stream-Page Decoupling', () => {
  const TEST_SLUG = 'decoupling-test';
  
  test('page loads without stream URL', async ({ page }) => {
    // Navigate to page
    await page.goto(`http://localhost:3000/direct/${TEST_SLUG}`);
    
    // Page should load
    await expect(page.getByTestId('stream-placeholder')).toBeVisible();
    await expect(page.getByText(/No stream configured/i)).toBeVisible();
    
    // Chat should still be accessible
    await expect(page.getByTestId('input-chat-message')).toBeVisible();
  });
  
  test('admin can configure settings without stream', async ({ page }) => {
    await page.goto(`http://localhost:3000/direct/${TEST_SLUG}`);
    
    // Open admin panel
    await page.getByTestId('btn-admin').click();
    await page.getByTestId('input-admin-password').fill('admin2026');
    await page.getByTestId('btn-unlock-admin').click();
    
    // Admin panel should open
    await expect(page.getByTestId('admin-panel')).toBeVisible();
    
    // Enable scoreboard without stream URL
    await page.getByTestId('checkbox-scoreboard-enabled').check();
    await page.getByTestId('btn-save-settings').click();
    
    // Should succeed
    await expect(page.getByText(/Settings saved/i)).toBeVisible();
  });
  
  test('admin can add stream URL after page creation', async ({ page }) => {
    await page.goto(`http://localhost:3000/direct/${TEST_SLUG}`);
    
    // Unlock admin
    await page.getByTestId('btn-admin').click();
    await page.getByTestId('input-admin-password').fill('admin2026');
    await page.getByTestId('btn-unlock-admin').click();
    
    // Add stream URL
    await page.getByTestId('input-stream-url').fill('https://stream.mux.com/test.m3u8');
    await page.getByTestId('btn-save-settings').click();
    
    // Reload page
    await page.reload();
    
    // Player should initialize (or show error if URL is invalid)
    await expect(page.getByTestId('video-player')).toBeVisible();
  });
});
```

---

### Phase 4: Backward Compatibility

**Ensure old clients still work:**

1. ✅ Bootstrap response includes flat fields (`streamUrl`, `chatEnabled`, etc.)
2. ✅ Old code using `bootstrap.streamUrl` will still work
3. ✅ Settings endpoint accepts both old and new formats
4. ✅ No database migrations required (reusing existing `DirectStream.streamUrl`)

---

## Rollout Plan

### Step 1: Backend Changes (Zero Downtime)
1. Deploy backend with new bootstrap structure (includes backward compat)
2. Verify old frontend still works
3. Monitor logs for any issues

### Step 2: Frontend Changes
1. Deploy frontend with new graceful degradation
2. Test on production with a dedicated test stream
3. Monitor error rates

### Step 3: Validation
1. Create 3 test streams:
   - Stream with valid URL
   - Stream with null URL
   - Stream with invalid URL
2. Verify all 3 load correctly
3. Verify admin panel works on all 3

### Step 4: Cleanup (Optional, Future)
1. Remove backward-compatible flat fields from API (breaking change)
2. Add migration to move `DirectStream.streamUrl` to separate `Stream` entity
3. Add health check service for stream monitoring

---

## Success Criteria

- [ ] Page loads in <1s even when stream URL is null
- [ ] Admin panel opens and saves settings without stream URL
- [ ] Chat works independently of stream status
- [ ] Scoreboard works independently of stream status
- [ ] Clear UX messaging when stream is unavailable
- [ ] Admin can configure stream URL after page creation
- [ ] No regressions on existing streams with valid URLs
- [ ] All E2E tests pass
- [ ] Zero 500 errors in production logs

---

## Edge Cases Handled

| Edge Case | Solution |
|-----------|----------|
| Bootstrap API timeout | Retry with exponential backoff |
| Invalid stream URL format | Validate on save, log warning, save other settings |
| Stream URL changes mid-session | Admin can update, page refreshes gracefully |
| Player fails to load manifest | Show error placeholder, keep page functional |
| Admin token expires during edit | Re-authenticate without losing changes |
| Multiple admins editing simultaneously | Last write wins (acceptable for MVP) |

---

## Future Enhancements (Out of Scope)

1. **Stream Health Monitoring** - Background job to check stream liveness
2. **Auto-Retry Player** - Exponential backoff when stream fails
3. **Stream Entity** - Separate `Stream` table for many-to-many relationships
4. **Multi-Stream Support** - Multiple camera angles per page
5. **DVR/Playback** - Show recorded stream if live stream is down

---

## Files Changed Summary

### Backend
- `apps/api/src/routes/direct.ts` (bootstrap + settings endpoints)
- `apps/api/src/routes/public.direct-stream-events.ts` (event bootstrap)
- `packages/data-model/src/schemas/directStreamBootstrap.ts` (NEW)

### Frontend
- `apps/web/components/DirectStreamPageBase.tsx` (graceful degradation)
- `apps/web/components/AdminPanel.tsx` (allow empty stream URL)
- `apps/web/lib/types/directStream.ts` (NEW - TypeScript types)
- `apps/web/__tests__/e2e/stream-decoupling.spec.ts` (NEW - E2E tests)

### Total Lines Changed: ~300 lines
### New Files: 3
### Risk Level: Low (backward compatible)

---

`ROLE: engineer STRICT=false`

Ready to implement. Approve to proceed.
I can do another pass. Let's do another check.