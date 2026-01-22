# Connection Debug System - Verification Checklist

**Date**: January 21, 2026, 20:25 UTC  
**Status**: ⏳ **DEPLOYING** | ✅ **PREFLIGHT PASSED**

---

## ✅ Build Status

- ✅ **Preflight Build**: PASSED (11 seconds)
- ✅ **TypeScript**: All critical errors fixed
- ✅ **Next.js Build**: All pages passed SSR/SSG
- ✅ **Code Pushed**: `28e3efd`

---

## 🔍 Production Verification Steps

### Step 1: Wait for Deployment
```bash
# Check status
./scripts/railway-logs.sh status

# Expected: Both services show SUCCESS
```

### Step 2: Access Debug Panel
1. Navigate to: `https://fieldview.live/direct/tchs/soccer-20260120-varsity?debug=true`
2. Look for yellow "Connection Debug" button in bottom-right corner
3. Alternative: Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac)

### Step 3: Verify Panel Opens
- [ ] Click "Connection Debug" button
- [ ] Panel opens with 5 tabs visible
- [ ] Status indicators show at top (Stream, API, Chat)

### Step 4: Test Each Tab

#### Stream Tab
- [ ] Player state displayed (PLAYING, LOADING, etc.)
- [ ] HLS version shown
- [ ] Stream type (LIVE/VOD) shown
- [ ] Current level and bitrate displayed
- [ ] Buffer length shown
- [ ] Time to first frame displayed
- [ ] Stream URL shown

#### API Tab
- [ ] Overall health indicator visible
- [ ] All 6 endpoints listed:
  - Bootstrap
  - Settings
  - Scoreboard
  - Viewers
  - Chat
  - Unlock
- [ ] Each endpoint shows status, latency, error rate
- [ ] "Check" button works for each endpoint

#### Chat Tab
- [ ] Connection status shown
- [ ] Transport type (SSE) displayed
- [ ] Message count shown
- [ ] Game ID displayed (if available)
- [ ] Viewer identity section shows:
  - Unlocked status
  - Has token
  - Viewer ID
  - Effective Game ID

#### Network Tab
- [ ] Recent requests listed (up to 50)
- [ ] Each request shows method, URL, status, duration
- [ ] Failed requests highlighted
- [ ] "Clear" button works
- [ ] Response body expandable (if available)

#### Metrics Tab
- [ ] Page load time displayed
- [ ] Bootstrap fetch time shown
- [ ] Stream connect time shown
- [ ] Chat connect time shown
- [ ] Total active time updating in real-time

### Step 5: Test Export
- [ ] Click "Export" button in panel header
- [ ] JSON file downloads
- [ ] File name includes timestamp
- [ ] Open file and verify it contains:
  - Browser info
  - Stream debug info
  - API health
  - Chat state
  - Network log
  - Console errors
  - Metrics

### Step 6: Test Keyboard Shortcut
- [ ] Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac)
- [ ] Panel toggles open/closed
- [ ] Works from any page state

### Step 7: Check Console Logs
- [ ] Open browser DevTools console
- [ ] Verify logs prefixed with `[Stream]`, `[API]`, `[Chat]`, etc.
- [ ] Check for emoji indicators (✅ ⚠️ ❌ 📡)
- [ ] Verify no React errors (#418, #423)

---

## 🐛 Troubleshooting

### Debug Panel Not Showing
1. Verify URL has `?debug=true` parameter
2. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Check browser console for errors
4. Verify you're on a DirectStream page (`/direct/*`)

### Panel Shows But Tabs Empty
1. Check browser console for errors
2. Verify network requests are being captured
3. Check if stream is configured (Stream tab needs HLS instance)

### Export Not Working
1. Check browser download permissions
2. Verify browser allows file downloads
3. Check console for export errors

### React Errors in Console
- Error #418: Hydration mismatch (may be non-critical)
- Error #423: Rendering outside component (check component structure)

---

## ✅ Success Criteria

- [x] Preflight build passes
- [ ] Debug panel visible in production
- [ ] All 5 tabs display correctly
- [ ] Export generates valid JSON
- [ ] Keyboard shortcut works
- [ ] Network requests captured
- [ ] Console logs visible
- [ ] No blocking React errors

---

## 📊 Expected Results

### Healthy System
- Stream: `PLAYING`, buffer > 0, no errors
- API: All endpoints `200 OK`, low latency
- Chat: `CONNECTED`, messages visible
- Network: All requests successful
- Metrics: Connect times < 2s

### Current State (No Stream)
- Stream: `LOADING` or `OFFLINE`
- API: Bootstrap `200 OK`
- Chat: May be `DISCONNECTED` if no game ID
- Network: Bootstrap request visible
- Metrics: Page load time shown

---

**Last Updated**: January 21, 2026, 20:25 UTC  
**Next Check**: Wait ~5-10 minutes for builds, then test
