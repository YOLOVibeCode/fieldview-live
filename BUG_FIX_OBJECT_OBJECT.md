# 🐛 BUG FIX: "[object Object]" Error in Demo Page

**Date**: January 13, 2026  
**Status**: ✅ **FIXED**

---

## 🔍 **Root Cause**

The demo page was showing **"[object Object]"** error instead of a readable error message when trying to register.

### **Primary Issue: Missing `slug` Parameter**

The demo page was calling:
```typescript
const viewer = useViewerIdentity({ gameId });
```

Without passing a `slug`, the hook would try to use `/api/public/games/${gameId}/viewer/unlock` endpoint. However, the demo is set up to use the TCHS direct stream, which requires the direct stream unlock endpoint.

### **Secondary Issue: Error Display**

Error handling in the demo page was converting error objects to strings incorrectly:
```typescript
setError(`Failed to initialize demo: ${err}`);  // BAD: Shows [object Object]
```

---

## ✅ **Fix Applied**

### **1. Pass `slug: 'tchs'` to Hook**

```typescript
// BEFORE:
const viewer = useViewerIdentity({ gameId });

// AFTER:
const viewer = useViewerIdentity({ gameId, slug: 'tchs' });
```

This ensures the hook uses the correct API endpoint:
```
POST /api/public/direct/tchs/viewer/unlock
```

### **2. Proper Error Message Extraction**

```typescript
// BEFORE:
setError(`Failed to initialize demo: ${err}`);

// AFTER:
const message = err instanceof Error ? err.message : String(err);
setError(`Failed to initialize demo: ${message}`);
```

This extracts the actual error message from Error objects.

---

## 🧪 **Test Results**

### **Before Fix:**
- ❌ Page showed "[object Object]" error immediately
- ❌ Registration failed with unclear error
- ❌ Could not access demo features

### **After Fix:**
- ✅ Page loads without errors
- ✅ Registration form is functional
- ✅ Can register with demo@test.com credentials
- ✅ All features accessible after registration

---

## 📝 **Files Changed**

**apps/web/app/demo-complete/page.tsx**
- Added `slug: 'tchs'` to `useViewerIdentity` call
- Fixed error message display to extract actual error text

---

## 🚀 **How to Test the Fix**

1. **Open demo page**: http://localhost:4300/demo-complete
2. **Verify no errors** on initial load
3. **Fill registration form**:
   - Email: demo@test.com
   - First Name: Demo
   - Last Name: Tester
4. **Click "Unlock Stream"**
5. **Success**: Page should unlock and show video player with scoreboard/chat

---

## ✅ **Commit**

```bash
git commit 76164d3
fix: resolve [object Object] error in demo page registration

- Pass 'tchs' slug to useViewerIdentity hook for proper API endpoint
- Fix error message display to show actual error text instead of [object Object]
- Demo page now uses direct stream unlock endpoint correctly
```

---

**Status**: ✅ **RESOLVED** - Demo page now works correctly for testing all features!

