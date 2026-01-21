# User Experience Test Checklist
## Stream-Page Decoupling Feature

**Test Date:** 2026-01-21  
**Environment:** Local Development  
**Ports:**
- API: http://localhost:4301
- Web: http://localhost:4300

---

## Prerequisites

### 1. Start Servers
```bash
# Terminal 1: API
cd apps/api
pnpm dev
# Should start on port 4301

# Terminal 2: Web
cd apps/web
pnpm dev
# Should start on port 4300
```

### 2. Verify Servers Running
```bash
# Check API
curl http://localhost:4301/health

# Check Web
curl http://localhost:4300
```

---

## Test Scenario 1: Page Loads Without Stream URL

**URL:** http://localhost:4300/direct/ux-test-1

### Expected Behavior
- [ ] Page loads successfully (no crash)
- [ ] Shows stream placeholder UI
- [ ] Placeholder displays one of:
  - "No Stream Configured" (if new page)
  - "Stream Offline" (if stream was previously set)
- [ ] Page title displays correctly
- [ ] Header shows stream name
- [ ] No JavaScript errors in console

### Visual Verification
- [ ] Placeholder has proper styling (centered, good contrast)
- [ ] Icon or graphic visible (camera icon or similar)
- [ ] Message text is readable
- [ ] Layout is responsive (test on mobile view)

---

## Test Scenario 2: Chat Works Without Stream

**URL:** http://localhost:4300/direct/ux-test-1

### Expected Behavior
- [ ] Chat panel is visible or accessible
- [ ] If collapsed, toggle button works
- [ ] Chat input field is enabled
- [ ] Can type in chat input
- [ ] Placeholder text shows: "Type a message..."
- [ ] Character counter visible (if enabled)

### Interactive Test
1. [ ] Click chat input
2. [ ] Type a test message
3. [ ] Verify input accepts text
4. [ ] Check "Send" button is enabled when text entered

---

## Test Scenario 3: Admin Panel Access

**URL:** http://localhost:4300/direct/ux-test-1

### Expected Behavior
- [ ] "Admin" button visible in top-right corner
- [ ] Clicking Admin opens password modal
- [ ] Password field visible with proper label
- [ ] "Show/Hide password" toggle works
- [ ] Enter password: `admin2026`
- [ ] Click "Unlock" button
- [ ] Admin panel slides in/appears
- [ ] Panel shows all settings sections

### Admin Panel Sections
- [ ] **Stream URL** section visible
  - [ ] Input field (empty if new stream)
  - [ ] Placeholder text guides user
  - [ ] Help text: "Leave empty to disable stream"
- [ ] **Chat Settings**
  - [ ] Toggle for enable/disable
  - [ ] Currently: ON by default
- [ ] **Scoreboard Settings**
  - [ ] Toggle for enable/disable
  - [ ] Home team input
  - [ ] Away team input
  - [ ] Color pickers
- [ ] **Paywall Settings**
  - [ ] Toggle for enable/disable
  - [ ] Price input (when enabled)
  - [ ] Message textarea
- [ ] **Save Button**
  - [ ] Clearly visible
  - [ ] Proper hover state

---

## Test Scenario 4: Save Settings WITHOUT Stream URL

**URL:** http://localhost:4300/direct/ux-test-1

### Test Steps
1. [ ] Open admin panel (password: `admin2026`)
2. [ ] **DO NOT enter stream URL** (leave empty)
3. [ ] Toggle scoreboard ON
4. [ ] Enter home team: "Test Home"
5. [ ] Enter away team: "Test Away"
6. [ ] Click "Save Settings"

### Expected Behavior
- [ ] Shows loading/saving state
- [ ] Success message appears: "Settings saved successfully"
- [ ] No error about missing stream URL
- [ ] Settings persist after page reload
- [ ] Stream placeholder still shows (no stream configured)
- [ ] Scoreboard toggle persists (ON)

---

## Test Scenario 5: Add Stream URL After Creation

**URL:** http://localhost:4300/direct/ux-test-1

### Test Steps
1. [ ] Open admin panel
2. [ ] Enter stream URL: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`
3. [ ] Click "Save Settings"
4. [ ] Wait for success message
5. [ ] **Reload page** (Cmd+R / Ctrl+R)

### Expected Behavior AFTER Reload
- [ ] Page loads successfully
- [ ] Stream placeholder is GONE
- [ ] Video player initializes
- [ ] Player shows:
  - Loading spinner (initially)
  - Video starts playing OR
  - Error message if stream unavailable
- [ ] Player controls visible
- [ ] Fullscreen button works
- [ ] Volume control works

---

## Test Scenario 6: Invalid Stream URL (Fault Tolerance)

**URL:** http://localhost:4300/direct/ux-test-2

### Test Steps
1. [ ] Open admin panel
2. [ ] Enable scoreboard
3. [ ] Enable chat
4. [ ] Enter INVALID stream URL: `not-a-valid-url`
5. [ ] Click "Save Settings"

### Expected Behavior
- [ ] Settings save successfully (no error)
- [ ] Success message shows
- [ ] Scoreboard setting saved (ON)
- [ ] Chat setting saved (ON)
- [ ] Invalid URL was silently skipped
- [ ] Stream remains unconfigured

### Verification
- [ ] Reload page
- [ ] Scoreboard is enabled
- [ ] Chat is enabled
- [ ] Stream placeholder still shows (invalid URL was ignored)

---

## Test Scenario 7: Clear Stream URL

**URL:** http://localhost:4300/direct/ux-test-1

### Test Steps
1. [ ] Ensure stream has URL from Test 5
2. [ ] Open admin panel
3. [ ] **Clear** stream URL field (delete all text)
4. [ ] Click "Save Settings"
5. [ ] Reload page

### Expected Behavior
- [ ] Settings save successfully
- [ ] After reload: stream placeholder returns
- [ ] Video player is GONE
- [ ] Chat still works
- [ ] Scoreboard still accessible
- [ ] Page remains functional

---

## Test Scenario 8: Mobile Responsiveness

**URL:** http://localhost:4300/direct/ux-test-1

### Test Steps
1. [ ] Open browser DevTools (F12)
2. [ ] Toggle device toolbar (responsive mode)
3. [ ] Test on iPhone 14 Pro (390x844)
4. [ ] Test on iPad (768x1024)

### Expected Behavior
- [ ] **Mobile (iPhone)**
  - [ ] Stream placeholder is centered
  - [ ] Text is readable (not cut off)
  - [ ] Admin button accessible
  - [ ] Chat toggles to bottom sheet
  - [ ] Touch targets are 44x44px minimum
  
- [ ] **Tablet (iPad)**
  - [ ] Layout adjusts appropriately
  - [ ] Chat can be side panel or bottom
  - [ ] Admin panel fits on screen
  - [ ] No horizontal scrolling

---

## Test Scenario 9: Keyboard Navigation

**URL:** http://localhost:4300/direct/ux-test-1

### Test Steps
1. [ ] Press Tab to navigate
2. [ ] Verify focus indicators visible
3. [ ] Can reach all interactive elements
4. [ ] Enter opens/activates focused element
5. [ ] Escape closes modals

### Expected Behavior
- [ ] Tab order is logical (top to bottom, left to right)
- [ ] Focus outline clearly visible
- [ ] No keyboard traps
- [ ] Skip to content link (if present)

---

## Test Scenario 10: Error States

### Test 10a: Network Failure
1. [ ] Open DevTools Network tab
2. [ ] Set throttling to "Offline"
3. [ ] Try to save settings

**Expected:**
- [ ] Shows error message
- [ ] User can retry
- [ ] No data loss

### Test 10b: Session Timeout
1. [ ] Open admin panel
2. [ ] Wait 1+ hour (or simulate expired token)
3. [ ] Try to save settings

**Expected:**
- [ ] Shows "Session expired"
- [ ] Prompts to log in again
- [ ] Does not lose unsaved changes

---

## Test Scenario 11: Backward Compatibility

**URL:** http://localhost:4301/api/direct/ux-test-1/bootstrap

### Test via API
```bash
curl http://localhost:4301/api/direct/ux-test-1/bootstrap | jq
```

### Expected JSON Structure
```json
{
  "page": {
    "slug": "ux-test-1",
    "title": "...",
    "chatEnabled": true,
    "scoreboardEnabled": false
  },
  "stream": null,
  
  "// Flat fields for backward compatibility",
  "slug": "ux-test-1",
  "streamUrl": null,
  "chatEnabled": true
}
```

### Verify
- [ ] `page` object exists
- [ ] `stream` object exists (or null)
- [ ] Flat fields exist
- [ ] Values match between nested and flat

---

## Performance Checks

### Page Load Time
- [ ] Initial load < 2 seconds
- [ ] Time to interactive < 3 seconds
- [ ] No layout shift (CLS < 0.1)

### Console
- [ ] No errors in console
- [ ] No warnings about deprecated APIs
- [ ] Proper logging (not excessive)

---

## Accessibility Checks

### Screen Reader
- [ ] Page title announced
- [ ] Stream status announced
- [ ] Form labels read correctly
- [ ] Error messages announced

### Contrast
- [ ] Text meets WCAG AA (4.5:1)
- [ ] Focus indicators visible
- [ ] Interactive elements distinguishable

---

## Sign-Off

### Tester
- **Name:** ________________
- **Date:** ________________
- **All tests passed:** [ ] YES [ ] NO

### Issues Found
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Notes
_________________________________________________________
_________________________________________________________
_________________________________________________________

---

`ROLE: engineer STRICT=false`

**This checklist covers the complete user experience for stream-page decoupling.**
