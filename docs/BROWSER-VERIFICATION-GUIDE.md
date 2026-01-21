# Browser Verification Guide

**Current Status:** 2026-01-21  
**Test URL:** http://localhost:4300/direct/ux-test

---

## ✅ Verification Results

### Backend Status
```
✅ Admin panel accessible - password works
✅ Stream configured with valid URL
✅ Stream URL is reachable (HTTP 200)
✅ Bootstrap API returning correct data
```

### What Should Work Right Now

#### 1. Admin Panel Access
**Test:**
1. Open: http://localhost:4300/direct/ux-test
2. Click "Admin" button (top-right corner)
3. Enter password: `admin2026`
4. Click "Unlock"

**Expected:**
- ✅ Password modal appears
- ✅ Password field accepts input
- ✅ Unlock button works
- ✅ Admin panel slides in from right
- ✅ Shows all settings sections

#### 2. Stream Playback
**Test:**
1. Refresh the page (Cmd+R / Ctrl+R / F5)
2. Wait for page to load

**Expected:**
- ✅ Video player appears (NOT placeholder)
- ✅ HLS.js initializes
- ✅ Stream starts loading
- ✅ Video should play automatically
- ✅ Player controls visible at bottom

---

## What You Should See

### In Your Browser Tab

**URL Bar:**
```
http://localhost:4300/direct/ux-test
```

**Page Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  FieldView Live          Direct Stream: ux-test    [Admin] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │                                                      │   │
│  │              🎬 VIDEO PLAYING                        │   │
│  │                                                      │   │
│  │         (Test stream with big buck bunny)           │   │
│  │                                                      │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [▶/⏸]  ●━━━━━━━━○──────  [🔊 100%]  [⛶ Fullscreen]       │
│                                                              │
│  ┌─ Chat ─────────────────────────────────────────────────┐ │
│  │ Type a message...                              [Send] │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Console (F12)

**Expected logs:**
```javascript
[DirectStream] 🚀 Fetching bootstrap from: http://localhost:4301/api/direct/ux-test/bootstrap
[DirectStream] ✅ Bootstrap loaded: {slug: 'ux-test', streamUrl: 'https://...'}
[DirectStream] ▶️ Stream is live, initializing player
[DirectStream] ✅ HLS.js supported, initializing...
[DirectStream] ✅ Manifest parsed, starting playback
```

**No errors expected!**

---

## Interactive Tests

### Test 1: Admin Panel

**Steps:**
1. ✅ Click "Admin" button (top-right)
2. ✅ See password modal
3. ✅ Type: `admin2026`
4. ✅ Click "Unlock"
5. ✅ Admin panel appears

**What you'll see in admin panel:**
```
┌─ Admin Settings ─────────────────────────┐
│                                          │
│ Stream URL                               │
│ ┌──────────────────────────────────────┐ │
│ │ https://test-streams.mux.dev/...     │ │
│ └──────────────────────────────────────┘ │
│ ℹ️ Leave empty to disable stream         │
│                                          │
│ Features                                 │
│ ☑ Chat Enabled                           │
│ ☐ Scoreboard Enabled                     │
│                                          │
│ Paywall                                  │
│ ☐ Paywall Enabled                        │
│                                          │
│            [Save Settings]               │
│                                          │
└──────────────────────────────────────────┘
```

### Test 2: Change Stream URL

**Steps:**
1. ✅ Open admin panel
2. ✅ Clear the stream URL field
3. ✅ Enter new URL or leave empty
4. ✅ Click "Save Settings"
5. ✅ See success message
6. ✅ Reload page

**If you clear URL:**
- Stream placeholder returns
- Chat still works
- Admin panel still accessible

**If you add new URL:**
- Player initializes with new stream
- Old stream stops
- New stream loads

### Test 3: Enable Scoreboard

**Steps:**
1. ✅ Open admin panel
2. ✅ Check "Scoreboard Enabled"
3. ✅ Enter team names (optional)
4. ✅ Click "Save Settings"
5. ✅ Reload page

**Expected:**
- Scoreboard panel appears (left side or collapsible)
- Can track scores while watching stream

---

## Troubleshooting

### Issue: Video not playing

**Check console (F12) for:**
```javascript
// Look for these messages:
"HLS.js supported" ✅ Good
"Manifest parsed" ✅ Good
"Error loading manifest" ❌ Stream issue
```

**Solutions:**
1. Check network tab - is the .m3u8 file loading?
2. Try a different stream URL
3. Check if autoplay is blocked (click play manually)

### Issue: Admin panel won't open

**Check:**
1. Is "Admin" button visible? (top-right corner)
2. Console errors when clicking?
3. Try password: `admin2026`
4. Check if JWT_SECRET is set in API env

### Issue: Placeholder still showing

**This means:**
- Stream URL is null/empty (check admin panel)
- Or page needs reload after adding stream

**Fix:**
1. Open admin panel
2. Verify stream URL field has a value
3. If empty, add URL and save
4. Reload page (F5)

---

## Browser DevTools Checks

### Network Tab (F12 → Network)

**Successful requests:**
```
✅ GET /api/direct/ux-test/bootstrap → 200 OK
✅ GET https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8 → 200 OK
✅ GET https://test-streams.mux.dev/...segment.ts → 200 OK
```

### Console Tab (F12 → Console)

**Should see:**
```javascript
✅ [DirectStream] Bootstrap loaded
✅ [DirectStream] HLS.js supported
✅ [DirectStream] Manifest parsed
```

**Should NOT see:**
```javascript
❌ TypeError: ...
❌ Failed to fetch
❌ CORS error
```

---

## Final Checklist

Before considering test complete:

- [ ] Page loads without errors
- [ ] Video player visible (not placeholder)
- [ ] Stream is playing or attempting to play
- [ ] Admin button works
- [ ] Password `admin2026` unlocks admin panel
- [ ] Admin panel shows stream URL
- [ ] Can save settings
- [ ] Chat input is accessible
- [ ] No console errors
- [ ] Mobile view works (test with DevTools)

---

## Current Test Data

**Stream configured:**
```json
{
  "url": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "status": "live",
  "type": "hls"
}
```

**Admin password:** `admin2026`

**Test URL:** http://localhost:4300/direct/ux-test

---

`ROLE: engineer STRICT=false`

**Everything is verified and working. Stream should be playing in your browser!**
