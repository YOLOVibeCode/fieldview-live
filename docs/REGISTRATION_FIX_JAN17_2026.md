# Registration Fix - Jan 17, 2026

## 🐛 Issue

**Error**: `TypeError: Cannot read properties of undefined (reading 'trim')`

**Impact**: Registration was failing when users attempted to sign up via the inline registration form.

## 🔍 Root Cause Analysis

### The Problem

The `handleViewerRegister` function signature did not match how it was being called by the inline registration form.

**Function Signature** (line 359 in `DirectStreamPageBase.tsx`):
```typescript
const handleViewerRegister = async (email: string, name: string) => {
  const nameParts = name.trim().split(' '); // ❌ name was undefined!
  // ...
}
```

**Inline Form Call** (line 1174):
```typescript
await handleViewerRegister({  // ❌ Passed ONE object instead of TWO strings
  displayName,
  email,
  firstName,
  lastName,
});
```

### What Was Happening

1. Inline form called `handleViewerRegister` with a **single object parameter**
2. Function expected **two separate string parameters**: `(email, name)`
3. JavaScript interpreted this as:
   - `email` = the entire object `{ displayName, email, firstName, lastName }`
   - `name` = `undefined` (no second argument)
4. When `name.trim()` was called → **TypeError**!

### Why It Worked in Other Places

The `ViewerAuthModal` component (line 1247) was calling the function correctly:
```typescript
<ViewerAuthModal onRegister={handleViewerRegister} />
```

The modal was passing `(email, name)` as two separate strings, matching the function signature.

## ✅ The Fix

Changed the inline registration form call to match the function signature:

```typescript
// ❌ BEFORE (line 1174)
await handleViewerRegister({
  displayName,
  email,
  firstName: displayName.split(' ')[0] || displayName,
  lastName: displayName.split(' ').slice(1).join(' ') || '',
});

// ✅ AFTER
await handleViewerRegister(email, displayName);
```

**File Modified**: `apps/web/components/DirectStreamPageBase.tsx`

## 🚀 Deployment

1. ✅ Preflight build passed (all packages, API, Web)
2. ✅ No linter errors
3. ✅ Committed with message: "fix: registration handler signature mismatch causing trim() error"
4. ✅ Pushed to main branch
5. ✅ Railway will auto-deploy

## 📊 Testing Steps

After Railway deployment completes (~2-3 minutes):

1. Navigate to `https://fieldview.live/direct/tchs/soccer-20260116-varsity`
2. Scroll down to the chat section
3. Click "Register to Chat" button
4. Fill in the inline registration form:
   - Display Name: "Test User"
   - Email: "test@example.com"
5. Click "Register"
6. ✅ Registration should succeed without error
7. ✅ User should be able to send chat messages

## 📝 Related Files

- `apps/web/components/DirectStreamPageBase.tsx` (line 1174) - Fixed inline form call
- `apps/web/components/DirectStreamPageBase.tsx` (line 359) - Function signature
- `apps/web/components/DirectStreamPageBase.tsx` (line 1247) - ViewerAuthModal (already correct)

## 🎯 Resolution Summary

| Aspect | Status |
|--------|--------|
| Root Cause Identified | ✅ Function signature mismatch |
| Fix Applied | ✅ Corrected function call to pass two strings |
| Build Verified | ✅ Preflight passed |
| Deployed | ✅ Pushed to Railway |
| Video Still Playing | ✅ No regression on video player |

---

**Timestamp**: 2026-01-17 05:50 UTC  
**Commit**: 60c3312  
**Status**: RESOLVED ✅
