# Stale Code Audit - Direct Stream Implementation

**Date**: January 21, 2026  
**Purpose**: Identify and deprecate old stream code in favor of the unified routing system  
**Status**: ✅ **AUDIT COMPLETE** - Ready for deprecation

---

## ✅ VERIFIED CURRENT (KEEP)

### 1. Unified Routing Page
**File**: `apps/web/app/direct/[slug]/[[...event]]/page.tsx`

- ✅ Handles all direct stream URLs: `/direct/{slug}` and `/direct/{slug}/{eventSlug}`
- ✅ Uses `DirectStreamPageBase` component
- ✅ Calls `/api/direct/{fullSlug}/bootstrap` (correct API)
- ✅ Works for new URLs like `/direct/tchs/soccer-20260122-varsity`
- ✅ Enforces lowercase URLs
- ✅ Supports one-level hierarchy only

### 2. Main Stream Component
**File**: `apps/web/components/DirectStreamPageBase.tsx`

- ✅ ~1640 lines, feature-complete
- ✅ Includes HLS player, chat, scoreboard, admin panel
- ✅ Includes new Connection Debug Panel
- ✅ All features work: paywall, viewer auth, analytics
- ✅ Uses correct API endpoints (`/api/direct/`)

### 3. Direct Stream API
**File**: `apps/api/src/routes/direct.ts`

- ✅ Production-ready API with database storage
- ✅ Handles bootstrap, settings, unlock, scoreboard
- ✅ JWT-based admin authentication
- ✅ Fault-tolerant stream URL handling

### 4. Tests Using Correct URLs
**File**: `apps/web/tests/e2e/direct-streams.spec.ts`

- ✅ Tests correct URL pattern: `/direct/tchs/soccer-20260113-*`
- ✅ Uses unified routing (not old date/team pattern)

---

## 🗑️ STALE CODE TO DEPRECATE

### 1. Old TCHS Date/Team Page
**File**: `apps/web/app/direct/tchs/[date]/[team]/page.tsx`

```
❌ STALE - Uses old API pattern /api/tchs/{streamKey}
❌ STALE - Uses buildTchsStreamKey utility
❌ STALE - Uses TchsFullscreenChatOverlay
❌ Route: /direct/tchs/{date}/{team} (e.g., /direct/tchs/20260106/SoccerVarsity)
```

**Why stale**:
- Uses `/api/tchs/` which has in-memory storage (not persistent)
- Different URL pattern than current `/direct/tchs/soccer-YYYYMMDD-team`
- Not used in production anymore

**Action**: DELETE

---

### 2. Removed: Super Admin API Key Flow (Feb 2026)

**Files removed**: `apps/api/src/middleware/superAdminApi.ts`, `apps/api/src/routes/admin.auth-api.ts`

- ❌ **Removed** – `POST /api/admin/auth/token` (JWT exchange for `SUPER_ADMIN_API_SECRET`) and `X-Super-Admin-Key` / `validateSuperAdminApi` are no longer used.
- ✅ **Current**: Super admin uses email/password login (`POST /api/admin/login`) and `sessionToken`; direct-streams routes use `requireAdminAuth` + `requireSuperAdmin`. See [ADMIN-DIRECT-STREAMS.md](ADMIN-DIRECT-STREAMS.md).

---

### 3. Old TCHS Main Page
**File**: `apps/web/app/direct/tchs/page.tsx`

```
⚠️ PARTIALLY STALE - Uses correct API but redundant
✅ Uses /api/direct/tchs/bootstrap (correct)
❌ Uses TchsFullscreenChatOverlay (not needed)
❌ Has hardcoded TCHS branding
```

**Why stale**:
- Unified route handles `/direct/tchs` already
- Redundant with `[slug]/[[...event]]/page.tsx`

**Action**: DELETE (unified route handles this)

---

### 4. Old TCHS Stream Key Utility
**File**: `apps/web/lib/tchs-stream-key.ts`

```
❌ STALE - Only used by old [date]/[team] page
❌ Format: tchs-YYYYMMDD-teamSlug (old pattern)
```

**Why stale**:
- Only imported by `apps/web/app/direct/tchs/[date]/[team]/page.tsx`
- New URL pattern doesn't use this utility

**Action**: DELETE

---

### 5. Old TCHS Stream Key Test
**File**: `apps/web/__tests__/unit/lib/tchs-stream-key.test.ts`

```
❌ STALE - Tests utility that will be deleted
```

**Action**: DELETE

---

### 6. TCHS Fullscreen Chat Overlay
**File**: `apps/web/components/TchsFullscreenChatOverlay.tsx`

```
⚠️ POTENTIALLY STALE - Only used by old TCHS pages
❌ Only imported by:
   - apps/web/app/direct/tchs/[date]/[team]/page.tsx (stale)
   - apps/web/app/direct/tchs/page.tsx (stale)
```

**Why stale**:
- Only used by the two TCHS-specific pages being deleted
- `DirectStreamPageBase` has its own chat implementation

**Action**: DELETE (after deleting TCHS pages)

---

### 7. DirectStreamPageV2 Wrapper
**File**: `apps/web/components/DirectStreamPageV2.tsx`

```
⚠️ STALE - Thin wrapper, not used anywhere
❌ Not imported by any page
❌ Only adds responsive hooks that DirectStreamPageBase already has
```

**Why stale**:
- Zero imports/usages
- `DirectStreamPageBase` already includes `useResponsive`

**Action**: DELETE

---

### 8. Old TCHS API Route
**File**: `apps/api/src/routes/tchs.ts`

```
❌ STALE - Uses in-memory storage (not persistent)
❌ Different API pattern than /api/direct/
❌ Route: /api/tchs/:slug/*
```

**Why stale**:
- Uses `Map<string, string>` for storage (not persistent!)
- Different from production `/api/direct/` which uses database
- Only used by old `[date]/[team]` page

**Action**: DELETE (after verifying no production dependencies)

---

### 9. Test File with Non-Existent Stream
**File**: `tests/e2e/direct-stream-complete-ux.spec.ts`

```
⚠️ STALE - Tests non-existent admin routes and stream
❌ Uses STREAM_SLUG = 'tchs-basketball-20260110' (doesn't exist)
❌ Tests admin creation flow that doesn't exist
❌ Tests `/admin/direct-streams` route (doesn't exist)
```

**Why stale**:
- Tests admin workflow that was never implemented
- Stream slug doesn't follow current pattern
- References non-existent routes

**Action**: DELETE or REWRITE

---

## 📊 Summary

| Category | Files to Delete | Files to Keep |
|----------|-----------------|---------------|
| Pages | 2 | 1 (unified) |
| Components | 2 | 1 (base) |
| Utilities | 1 | 0 |
| API Routes | 1 | 1 (direct.ts) |
| Tests | 2 | 1 |
| **Total** | **8** | **3** |

---

## 🔧 Deprecation Plan

### Phase 1: Verify Current Implementation Works
- [x] Test `/direct/tchs/soccer-20260122-varsity` - **WORKS**
- [x] Test `/direct/tchs/soccer-20260122-jv` - **WORKS**
- [x] Test `/direct/tchs/soccer-20260122-jv2` - **WORKS**
- [x] Test `/direct/tchs` - **WORKS**
- [ ] Test production deployment

### Phase 2: Delete Stale Files
```bash
# Delete old pages
rm apps/web/app/direct/tchs/page.tsx
rm -rf apps/web/app/direct/tchs/[date]

# Delete old components
rm apps/web/components/TchsFullscreenChatOverlay.tsx
rm apps/web/components/DirectStreamPageV2.tsx

# Delete old utilities
rm apps/web/lib/tchs-stream-key.ts

# Delete old tests
rm apps/web/__tests__/unit/lib/tchs-stream-key.test.ts

# Delete stale E2E test
rm tests/e2e/direct-stream-complete-ux.spec.ts

# Delete old API route
rm apps/api/src/routes/tchs.ts
```

### Phase 3: Update Server Configuration
- Remove TCHS router from `apps/api/src/server.ts`
- Update any remaining imports

### Phase 4: Update Tests
- Update `apps/web/tests/e2e/direct-streams.spec.ts` if needed
- Verify all E2E tests pass

### Phase 5: Deploy and Verify
- Run preflight build
- Deploy to Railway
- Verify all URLs work in production

---

## ⚠️ Dependencies to Check Before Deletion

### TCHS API Route (`apps/api/src/routes/tchs.ts`)

Check if any production traffic still uses `/api/tchs/`:
```bash
# In Railway logs
railway logs --service api | grep "/api/tchs/"
```

### Environment Variables

Check for TCHS-specific env vars:
- `TCHS_ADMIN_PASSWORD` - Used by old route, also used by `stream-links.ts` as fallback

---

## 📝 Notes

1. **Backward Compatibility**: Old URLs like `/direct/tchs/20260106/SoccerVarsity` will still work but use the unified routing (returns 200, works as expected)

2. **API Transition**: The old `/api/tchs/` route uses in-memory storage which means stream URLs are lost on restart. The new `/api/direct/` route uses the database.

3. **Chat Integration**: Both routes create Game records for chat, but the new route is more robust.

---

**Last Updated**: January 21, 2026  
**Auditor**: AI Engineer  
**Status**: Ready for Phase 2 (Deprecation)
