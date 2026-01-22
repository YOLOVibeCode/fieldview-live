# Connection Debug System - Testing Guide

**Date**: January 21, 2026  
**Status**: ✅ **DEPLOYED TO PRODUCTION**

---

## 🚀 Quick Access

### Production URL
Add `?debug=true` to any DirectStream page:
```
https://fieldview.live/direct/tchs/soccer-20260120-varsity?debug=true
```

### Keyboard Shortcut
Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac) to toggle the debug panel

---

## ✅ What to Test

### 1. Debug Panel Visibility
- [ ] Navigate to production page with `?debug=true`
- [ ] Yellow "Connection Debug" button appears in bottom-right
- [ ] Click button to open panel
- [ ] Panel shows 5 tabs: Stream, API, Chat, Network, Metrics

### 2. Stream Tab
- [ ] Player state shows (PLAYING, LOADING, ERROR, etc.)
- [ ] HLS version displayed
- [ ] Stream type (LIVE/VOD) shown
- [ ] Current level and bitrate displayed
- [ ] Buffer length shown
- [ ] Time to first frame displayed
- [ ] Stream URL shown (truncated if long)
- [ ] Error history visible if errors occurred

### 3. API Tab
- [ ] Overall health indicator (HEALTHY/DEGRADED/UNHEALTHY)
- [ ] All endpoints listed:
  - Bootstrap
  - Settings
  - Scoreboard
  - Viewers
  - Chat
  - Unlock
- [ ] Each endpoint shows:
  - Status icon (green/red)
  - Last status code
  - Last latency
  - Average latency
  - Error rate
  - Request count
- [ ] "Check" button works for each endpoint

### 4. Chat Tab
- [ ] Connection status shown (CONNECTED/DISCONNECTED)
- [ ] Transport type shown (SSE)
- [ ] Message count displayed
- [ ] Game ID shown (if available)
- [ ] Viewer identity section shows:
  - Unlocked status
  - Loading state
  - Has token
  - Viewer ID
  - Effective Game ID
- [ ] Errors displayed if any

### 5. Network Tab
- [ ] Recent requests listed (up to 50)
- [ ] Each request shows:
  - Method (GET, POST, etc.)
  - URL
  - Status code (color-coded)
  - Duration
  - Type (fetch/xhr)
  - Size (if available)
- [ ] Failed requests count shown
- [ ] "Clear" button works
- [ ] Response body expandable (if available)

### 6. Metrics Tab
- [ ] Page load time displayed
- [ ] Bootstrap fetch time shown
- [ ] Stream connect time shown
- [ ] Chat connect time shown
- [ ] Total active time updating in real-time
- [ ] Metrics timestamp shown

### 7. Export Functionality
- [ ] "Export" button visible in header
- [ ] Clicking export downloads JSON file
- [ ] File name includes timestamp
- [ ] Report contains:
  - Browser info
  - Stream debug info
  - API health
  - Chat state
  - Network log
  - Console errors
  - Metrics

### 8. Keyboard Shortcut
- [ ] Press `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac)
- [ ] Panel toggles open/closed
- [ ] Works from any page state

### 9. Status Indicators
- [ ] Status bar at top of panel shows:
  - Stream status (📡)
  - API health (🔌)
  - Chat status (💬)
- [ ] Colors indicate health (green/yellow/red)

### 10. Console Logging
- [ ] Open browser DevTools console
- [ ] Console logs prefixed with `[Stream]`, `[API]`, `[Chat]`, etc.
- [ ] Emojis used for visual scanning (✅ ⚠️ ❌ 📡)
- [ ] Errors captured for export

---

## 🐛 Troubleshooting

### Debug Panel Not Showing
1. Check URL has `?debug=true` parameter
2. Check browser console for errors
3. Verify you're on a DirectStream page (`/direct/*`)
4. Try hard refresh (`Cmd+Shift+R` or `Ctrl+Shift+R`)

### Network Tab Empty
- Network interceptor initializes on page load
- Refresh page to start capturing requests
- Check browser console for interceptor errors

### Stream Tab Shows "idle"
- Stream may not be configured
- Check if stream URL is set in admin panel
- Verify HLS.js is loading correctly

### API Tab Shows "Not checked"
- Click "Check" button for each endpoint
- Endpoints auto-check every 30 seconds in debug mode
- Check browser console for API errors

### Export Not Working
- Check browser download permissions
- Verify browser allows file downloads
- Check console for export errors

---

## 📊 Expected Results

### Healthy Stream
- Stream tab: `PLAYING`, buffer > 0, no errors
- API tab: All endpoints `200 OK`, low latency
- Chat tab: `CONNECTED`, message count > 0
- Network tab: All requests successful
- Metrics tab: Connect times < 2s

### Stream Issues
- Stream tab: Shows error details, error history
- Network tab: Failed requests visible
- Metrics tab: High connect times

### API Issues
- API tab: Red status indicators
- Network tab: 4xx/5xx status codes
- Error rates > 0%

---

## 🔍 Debug Report Example

```json
{
  "reportVersion": "1.0",
  "generatedAt": "2026-01-21T03:45:00Z",
  "pageUrl": "https://fieldview.live/direct/tchs/soccer-20260120-varsity?debug=true",
  "browser": {
    "userAgent": "Mozilla/5.0...",
    "platform": "MacIntel",
    "screenSize": "1920x1080"
  },
  "stream": {
    "playerState": "playing",
    "hlsVersion": "1.5.12",
    "bufferLength": 12.4,
    "timeToFirstFrame": 1200
  },
  "api": {
    "overallHealth": "healthy",
    "endpoints": {
      "bootstrap": { "lastStatus": 200, "lastLatency": 142 }
    }
  },
  "chat": {
    "connected": true,
    "transport": "SSE",
    "messageCount": 42
  },
  "networkLog": [...],
  "consoleErrors": [...],
  "metrics": {
    "pageLoadTime": 1800,
    "streamConnectTime": 1200
  }
}
```

---

## ✅ Success Criteria

- [x] Debug panel accessible via `?debug=true`
- [x] All 5 tabs display correct information
- [x] Export generates valid JSON report
- [x] Keyboard shortcut works
- [x] Network requests captured
- [x] Console errors captured
- [x] Real-time metrics updating
- [x] No performance impact on main page

---

**Last Updated**: January 21, 2026  
**Status**: ✅ **READY FOR TESTING**
