# Console Debugging Guide - DirectStream Pages

**Date:** 2026-01-21  
**Commit:** `2c6d159`  
**Status:** ✅ Comprehensive console instrumentation deployed

---

## Overview

Every interaction and error on DirectStream pages now has detailed console logging to enable complete triage from the browser console.

**Key Feature:** Any red error message shown to users is automatically logged to console with full context.

---

## Console Log Categories

### 🎬 Component Lifecycle
```javascript
[AdminPanel] 🎬 Component mounted/rendered
  - slug: "tchs"
  - hasInitialSettings: true
  - initialStreamUrl: null
```

### 🔐 Admin Authentication
```javascript
// Unlock attempt started
[AdminPanel] 🔐 Unlock attempt started
  - slug: "tchs"
  - passwordLength: 8
  - hasPassword: true

// Button clicked
[AdminPanel] 🖱️ Unlock button clicked
  - passwordLength: 8
  - isUnlocking: false
  - buttonDisabled: false

// Request sent
[AdminPanel] 📡 Sending unlock request
  - url: "https://api.fieldview.live/api/direct/tchs/unlock-admin"
  - method: "POST"
  - hasPassword: true

// Response received
[AdminPanel] 📥 Unlock response received
  - status: 200
  - statusText: "OK"
  - ok: true

// Data parsed
[AdminPanel] 📦 Unlock response data
  - hasToken: true
  - hasError: false

// Success
[AdminPanel] ✅ Admin panel unlocked successfully

// Finished
[AdminPanel] 🏁 Unlock attempt finished
  - isUnlocked: true
  - hasError: false
```

### 💾 Settings Save
```javascript
// Save started
[AdminPanel] 💾 Save settings attempt started
  - slug: "tchs"
  - hasToken: true
  - streamUrl: "https://..."
  - chatEnabled: true
  - scoreboardEnabled: false

// Button clicked
[AdminPanel] 🖱️ Save Settings button clicked
  - hasToken: true
  - isSaving: false
  - streamUrl: "https://..."

// Request sent
[AdminPanel] 📤 Sending settings update
  - payload: {...}
  - streamUrlProvided: true
  - streamUrlLength: 45

// Response received
[AdminPanel] 📥 Settings response received
  - status: 200
  - ok: true

// Data parsed
[AdminPanel] 📦 Settings response data
  - success: true
  - hasError: false
  - streamUrlSaved: "https://..."

// Success
[AdminPanel] ✅ Settings saved successfully

// Finished
[AdminPanel] 🏁 Save settings finished
  - saveSuccess: true
  - saveError: ""
```

### 🔴 Red Error Messages

**Every red error message triggers this log:**

```javascript
[AdminPanel] 🔴 RED ERROR DISPLAYED:
  - type: "unlock" | "save" | "chat" | "scoreboard"
  - message: "Error message text"
  - timestamp: "2026-01-21T01:23:45.678Z"
```

**Error Types:**

| Type | Where | When |
|------|-------|------|
| `unlock` | Admin password modal | Failed to unlock admin panel |
| `save` | Admin settings panel | Failed to save settings |
| `chat` | Chat panel | Chat connection or send error |
| `scoreboard` | Scoreboard panel | Failed to load scoreboard |

---

## Error Scenarios and Logs

### Scenario 1: Wrong Password

**User sees:** Red error "Invalid password"

**Console shows:**
```javascript
[AdminPanel] 🔐 Unlock attempt started
[AdminPanel] 🖱️ Unlock button clicked
[AdminPanel] 📡 Sending unlock request
[AdminPanel] 📥 Unlock response received { status: 401 }
[AdminPanel] 📦 Unlock response data { hasError: true, error: "Invalid password" }
[AdminPanel] ❌ Unlock failed { status: 401, error: "Invalid password" }
[AdminPanel] ❌ Unlock error caught { errorMessage: "Invalid password" }
[AdminPanel] 🔴 RED ERROR DISPLAYED: { type: "unlock", message: "Invalid password" }
[AdminPanel] 🏁 Unlock attempt finished { hasError: true }
```

### Scenario 2: Token Expired

**User sees:** Red error "Session expired. Please log in again."

**Console shows:**
```javascript
[AdminPanel] 💾 Save settings attempt started
[AdminPanel] 📡 Sending settings update
[AdminPanel] 📥 Settings response received { status: 401 }
[AdminPanel] ❌ Token expired (401)
[AdminPanel] 🔴 RED ERROR DISPLAYED: { type: "save", message: "Session expired..." }
```

### Scenario 3: Network Error

**User sees:** Red error "Failed to fetch" or "Failed to save settings"

**Console shows:**
```javascript
[AdminPanel] 📡 Sending unlock request
[AdminPanel] ❌ Unlock error caught {
  error: TypeError: Failed to fetch,
  errorType: "TypeError"
}
[AdminPanel] 🔴 RED ERROR DISPLAYED: { message: "Failed to unlock admin panel" }
```

### Scenario 4: Invalid Data

**User sees:** Red error with validation details

**Console shows:**
```javascript
[AdminPanel] ❌ Settings save failed {
  status: 400,
  error: "Invalid request",
  details: [{validation: "url", message: "Invalid url"}]
}
```

---

## How to Use for Debugging

### Step 1: Open Browser Console
- Press **F12** or **Cmd+Option+I**
- Click **Console** tab
- Clear console (**Cmd+K** / **Ctrl+L**)

### Step 2: Filter Logs
```javascript
// Filter to AdminPanel only
Filter: [AdminPanel]

// Filter to errors only
Filter: 🔴

// Filter to specific action
Filter: Unlock
Filter: Save
```

### Step 3: Reproduce Issue
1. Perform the action that causes the error
2. Look for the 🔴 RED ERROR log
3. Expand the log to see full details
4. Check the sequence of events leading to error

### Step 4: Identify Root Cause
Look for patterns:
- **401/403:** Authentication issue
- **400:** Validation failure
- **500:** Server error
- **TypeError:** JavaScript runtime error
- **Failed to fetch:** Network/CORS issue

---

## Example Debugging Session

**Problem:** "Red error appears when clicking Save Settings"

**Steps:**
1. Open console, clear logs
2. Click "Save Settings"
3. Look for logs in order:

```javascript
[AdminPanel] 🖱️ Save Settings button clicked ✅
[AdminPanel] 💾 Save settings attempt started ✅
[AdminPanel] 📤 Sending settings update ✅
[AdminPanel] 📥 Settings response received { status: 500 } ❌
[AdminPanel] 📦 Settings response data { hasError: true }
[AdminPanel] ❌ Settings save failed { error: "Internal error" }
[AdminPanel] 🔴 RED ERROR DISPLAYED: { message: "Internal error" }
```

**Diagnosis:** Server returned 500. Check Railway logs for backend error.

---

## Production URLs to Test

### TCHS Main
- URL: https://fieldview.live/direct/tchs
- Password: `tchs2026`
- Console filter: `[AdminPanel]`

### Soccer Varsity
- URL: https://fieldview.live/direct/tchs-soccer-20260120-varsity
- Password: `admin2026`
- Console filter: `[AdminPanel]`

---

## Logging Added

### AdminPanel Component

| Event | Log Emoji | Details Logged |
|-------|-----------|----------------|
| Component mount | 🎬 | slug, initialSettings |
| Unlock start | 🔐 | slug, passwordLength |
| Button click | 🖱️ | password status, button state |
| API request | 📡 📤 | URL, method, payload |
| API response | 📥 | status, statusText, ok |
| Response data | 📦 | parsed data, errors |
| Success | ✅ | confirmation |
| Error | ❌ | error details, stack |
| Red error shown | 🔴 | type, message, timestamp |
| Finish | 🏁 | final state |

### DirectStreamPageBase Component

| Event | Log Emoji | Details Logged |
|-------|-----------|----------------|
| Chat error | 🔴 | error message, timestamp |
| Scoreboard error | 🔴 | error message, timestamp |
| Bootstrap fetch | Already exists | Full lifecycle |
| Stream init | Already exists | HLS.js events |

---

## Quick Reference

### Find All Errors
```javascript
// In console, filter by:
🔴

// Or run:
console.table(
  performance.getEntriesByType('navigation')
    .map(e => ({type: e.type, duration: e.duration}))
)
```

### Export Console Logs
```javascript
// Right-click in console → Save as... → logs.txt
```

### View Network Timeline
```javascript
// F12 → Network tab
// Look for red (failed) requests
// Click request → Preview/Response to see error
```

---

## Benefits

- ✅ Complete visibility into every user interaction
- ✅ Red errors automatically logged with context
- ✅ Request/response pairs easy to correlate
- ✅ Timestamps for performance analysis  
- ✅ Error types clearly identified
- ✅ No guessing what went wrong
- ✅ Easy to share logs for support

---

`ROLE: engineer STRICT=false`

**Deployed! Now every error on the page will be fully logged in the browser console for easy debugging.**
