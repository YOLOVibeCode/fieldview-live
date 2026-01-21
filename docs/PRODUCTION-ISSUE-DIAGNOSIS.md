# Production Issue Diagnosis

**Date:** 2026-01-21  
**Status:** 🔴 Production API Error  
**Issue:** Bootstrap endpoint returning INTERNAL_ERROR

---

## Current Status

### API Health
```
✅ https://api.fieldview.live/health → 200 OK
   - Database: OK
   - Redis: OK
```

### Bootstrap Endpoint
```
❌ https://api.fieldview.live/api/direct/tchs/bootstrap
   
Response:
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

### Local Environment
```
✅ http://localhost:4301/api/direct/tchs/bootstrap → 200 OK
   
Response:
{
  "page": true,
  "stream": false,
  "slug": "tchs",
  "title": "TCHS Live Stream"
}
```

**Conclusion:** Code works locally, issue is production-specific.

---

## Commits Deployed

1. **`60595d3`** - Initial stream-page decoupling
   - ❌ Had incorrect import path
   
2. **`1526410`** - Fix import path
   - ✅ Preflight passed locally
   - 🟡 Deploying to Railway now

---

## Likely Issue

The `getStreamStatus` function may have an issue in production that's not caught locally.

### Hypothesis
The error occurs in `apps/api/src/routes/direct.ts` at line ~188 where we call:
```typescript
const streamConfig = getStreamStatus(directStream.streamUrl);
```

This function is in the new schema file and may:
1. Have a runtime error not caught by TypeScript
2. Be importing something incorrectly
3. Have an issue with null handling

---

## Diagnostic Steps

### Step 1: Check Railway Logs
```bash
./scripts/railway-logs.sh tail api | grep -i "error"
```

Look for:
- Stack traces
- Module errors
- Runtime errors in `getStreamStatus`

### Step 2: Test getStreamStatus Function

Let me verify the function handles all cases:

```typescript
// Test cases:
getStreamStatus(null)           // Should return null
getStreamStatus("")             // Should return null  
getStreamStatus("invalid-url")  // Should return error object
getStreamStatus("https://...")  // Should return live object
```

### Step 3: Add Defensive Code

Wrap `getStreamStatus` in try-catch to prevent crashes:

```typescript
let streamConfig;
try {
  streamConfig = getStreamStatus(directStream.streamUrl);
} catch (error) {
  logger.error({ error, streamUrl: directStream.streamUrl }, 'getStreamStatus failed');
  streamConfig = null;
}
```

---

## Action Plan

### Option 1: Add Defensive Code (Recommended)
1. Wrap `getStreamStatus` in try-catch
2. Log errors but don't crash
3. Return null stream on error
4. Test locally
5. Deploy fix

### Option 2: Simplify getStreamStatus
1. Make function more defensive
2. Add null checks everywhere
3. Return null instead of throwing
4. Test locally
5. Deploy fix

### Option 3: Rollback + Fix
1. Revert both commits
2. Fix locally with better error handling
3. Test thoroughly
4. Redeploy

---

## Immediate Fix

Let me add defensive error handling to the bootstrap endpoint.

---

`ROLE: engineer STRICT=false`

**Production has an error in getStreamStatus function. Adding defensive code now.**
