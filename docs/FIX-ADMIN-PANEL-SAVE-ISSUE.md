# 🔧 FIX: Admin Panel Stream Save Issue

## Issue Summary
Admin panel could not save stream settings because it was using the base slug (`tchs`) instead of the full slug (`tchs/soccer-20260122-jv2`) when calling the API endpoints.

---

## Root Cause

The `AdminPanel` component was extracting only the base slug (part before the first slash) from the full slug:

```typescript
// ❌ BEFORE: Extracted base slug
const baseSlug = slug.split('/')[0]; // "tchs" from "tchs/soccer-20260122-jv2"
```

This caused:
1. **Unlock endpoint**: Looked for DirectStream with slug `"tchs"` but the actual slug in database is `"tchs/soccer-20260122-jv2"` → Stream not found
2. **Save endpoint**: Same issue → Could not find stream to update → Save failed

---

## Solution Implemented

### File Changed:
**`apps/web/components/AdminPanel.tsx`**

### Changes:

1. **Updated `handleUnlock` function** (lines 79-161):
   - Changed from `baseSlug = slug.split('/')[0]` to `fullSlug = slug.toLowerCase()`
   - Updated API URL to use `encodeURIComponent(fullSlug)` for proper URL encoding
   - Updated console logs to reflect full slug usage

2. **Updated `handleSave` function** (lines 163-318):
   - Changed from `baseSlug = slug.split('/')[0]` to `fullSlug = slug.toLowerCase()`
   - Updated settings endpoint URL to use `encodeURIComponent(fullSlug)`
   - Updated scoreboard setup endpoint URL to use `encodeURIComponent(fullSlug)`
   - Updated console logs to reflect full slug usage

### Code Changes:

**Before:**
```typescript
const baseSlug = slug.split('/')[0];
const url = `${apiUrl}/api/direct/${baseSlug}/unlock-admin`;
```

**After:**
```typescript
const fullSlug = slug.toLowerCase();
const url = `${apiUrl}/api/direct/${encodeURIComponent(fullSlug)}/unlock-admin`;
```

---

## Impact

### ✅ **FIXES**:
1. Admin panel can now unlock with the correct full slug
2. JWT token is issued for the correct full slug matching the database record
3. Save operation finds and updates the correct DirectStream record
4. URL encoding properly handles slugs with slashes (e.g., `tchs/soccer-20260122-jv2`)

### ✅ **PRESERVES**:
1. All existing functionality remains intact
2. API endpoints already supported full slugs - no backend changes needed
3. Middleware validation works correctly with full slugs
4. No changes to database schema or data

---

## Technical Details

### How It Works:

1. **Frontend (AdminPanel)**:
   - Receives full slug from `DirectStreamPageBase`: `bootstrap?.slug` (e.g., `"tchs/soccer-20260122-jv2"`)
   - Uses full slug for all API calls
   - URL-encodes the slug for safe transmission: `encodeURIComponent("tchs/soccer-20260122-jv2")` → `"tchs%2Fsoccer-20260122-jv2"`

2. **Backend (API)**:
   - Express automatically URL-decodes route parameters
   - `req.params.slug` receives the decoded full slug: `"tchs/soccer-20260122-jv2"`
   - Database lookup uses the full slug: `findUnique({ where: { slug: "tchs/soccer-20260122-jv2" }})`
   - JWT token is issued with the full slug: `{ slug: "tchs/soccer-20260122-jv2", role: "admin" }`

3. **Middleware Validation**:
   - JWT token contains full slug: `"tchs/soccer-20260122-jv2"`
   - URL parameter contains full slug: `"tchs/soccer-20260122-jv2"`
   - Validation passes: `decoded.slug === urlSlug` ✅

---

## Testing

### Manual Test Steps:
1. Navigate to: `https://fieldview.live/direct/tchs/soccer-20260122-jv2`
2. Click "Admin Panel" button
3. Enter password: `tchs2026`
4. Click "Unlock"
5. Enter a stream URL (e.g., `https://example.com/stream.m3u8`)
6. Click "Save Settings"
7. ✅ Settings should save successfully
8. ✅ Page should reload and show the new stream URL

### Expected Behavior:
- ✅ Unlock succeeds (finds stream by full slug)
- ✅ JWT token issued for full slug
- ✅ Save succeeds (finds stream by full slug)
- ✅ Stream URL persists after page reload

---

## Files Modified:
- `apps/web/components/AdminPanel.tsx` (3 locations updated)

## Deployment Status:
- ✅ Fix implemented
- ✅ No linter errors
- ✅ No breaking changes
- ✅ Ready for deployment

---

## Related Issues:
- Previous fix: `FIX-ADMIN-STREAMURL-ISSUE.md` (overlay blocking issue)
- This fix addresses the save functionality that was broken due to slug mismatch
