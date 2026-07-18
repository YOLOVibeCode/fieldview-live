# 📋 Direct Stream Complete UX Manual Test Script

**Test Date**: _____________  
**Tester Name**: _____________  
**Build/Commit**: _____________  
**Environment**: Local Development

---

## 🎯 Test Scenario: "Friday Night Varsity Basketball Game"

**Stream**: TCHS Varsity Basketball vs Rival HS  
**Slug**: `tchs-basketball-20260110`  
**Duration**: ~90 minutes

---

## 📦 Pre-Test Setup

### ✅ Prerequisites Checklist
- [ ] All services running:
  ```bash
  docker compose up -d postgres redis mailpit
  cd apps/api && pnpm dev     # Terminal 1
  cd apps/web && pnpm dev     # Terminal 2
  ```
- [ ] Verify services healthy:
  - API: http://localhost:4301/health
  - Web: http://localhost:4300
  - Mailpit: http://localhost:4304
- [ ] Clear previous test data:
  ```bash
  docker exec fieldview-postgres psql -U fieldview -d fieldview_dev -c "
  DELETE FROM \"GameChatMessage\" WHERE \"gameId\" IN (
    SELECT \"gameId\" FROM \"DirectStream\" WHERE slug LIKE 'tchs-basketball%'
  );
  DELETE FROM \"DirectStream\" WHERE slug LIKE 'tchs-basketball%';
  "
  ```
- [ ] Clear browser cache and localStorage
- [ ] Empty Mailpit inbox
- [ ] Prepare 3 browser profiles/windows:
  - **Window 1**: Admin (Desktop)
  - **Window 2**: Viewer 1 - Parent (Desktop)
  - **Window 3**: Viewer 2 - Alumni (Mobile simulation: Chrome DevTools)

---

## 🧪 TEST EXECUTION

### Phase 1: Stream Creation & Configuration (Admin)

#### Test 1.1: Create New Direct Stream
**Window**: Admin  
**Time Started**: _______

**Steps**:
1. Navigate to: `http://localhost:4300/admin/direct-streams`
2. Click "Create New Direct Stream" button
3. Fill in form:
   - **Slug**: `tchs-basketball-20260110`
   - **Title**: `TCHS Varsity Basketball vs Rival HS`
   - **Stream URL**: `https://test.stream.com/tchs-basketball.m3u8`
4. Click "Save"

**Expected Results**:
- [ ] Stream created successfully
- [ ] Success message appears
- [ ] Redirected to stream management page
- [ ] Stream visible in admin list
- [ ] Slug is lowercase: `tchs-basketball-20260110`

**Actual Results**: _________________________________

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

**Notes**: _________________________________

---

#### Test 1.2: Enable Chat
**Window**: Admin  
**Time Started**: _______

**Steps**:
1. In stream management page, find "Enable Chat" toggle
2. Click toggle → ON
3. Observe confirmation message
4. Click "Save Changes"

**Expected Results**:
- [ ] Chat toggle turns green/enabled
- [ ] "Chat enabled successfully" confirmation
- [ ] Settings saved without errors

**Verification** (Terminal):
```bash
curl -s http://localhost:4301/api/direct/tchs-basketball-20260110/bootstrap | jq '.chatEnabled'
# Expected output: true
```
**Verification Result**: _______

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

#### Test 1.3: Configure Scoreboard
**Window**: Admin  
**Time Started**: _______

**Steps**:
1. Toggle "Enable Scoreboard" → ON
2. Fill in team details:
   - **Home Team**: `TCHS Eagles`
   - **Away Team**: `Rival Rockets`
   - **Home Color**: `#1e3a8a` (Navy blue)
   - **Away Color**: `#dc2626` (Red)
3. Leave scores at: **0 - 0**
4. Click "Save Settings"

**Expected Results**:
- [ ] Scoreboard enabled
- [ ] Team names accept input
- [ ] Color pickers work
- [ ] Settings saved successfully

**Verification** (Terminal):
```bash
curl -s http://localhost:4301/api/direct/tchs-basketball-20260110/scoreboard | jq
# Verify: homeTeam, awayTeam, homeScore: 0, awayScore: 0
```
**Verification Result**: _______

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

### Phase 2: Viewer Access

#### Test 2.1: Viewer 1 Access (Desktop)
**Window**: Viewer 1 (Desktop)  
**Time Started**: _______

**Steps**:
1. Open new browser window/incognito
2. Navigate to: `http://localhost:4300/direct/tchs-basketball-20260110`
3. Observe page load

**Expected Results**:
- [ ] Page loads within 3 seconds
- [ ] Stream title displays: "TCHS Varsity Basketball vs Rival HS"
- [ ] Video player visible and centered
- [ ] Scoreboard visible (top-left, collapsed)
- [ ] Chat panel visible (right side, collapsed)
- [ ] Footer: "Powered by FieldView.Live"
- [ ] Keyboard hints visible: "Press F for fullscreen"

**Page Load Time**: _______ms

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

**Screenshot**: _______

---

#### Test 2.2: Viewer 2 Access (Mobile Simulation)
**Window**: Viewer 2 (Mobile)  
**Time Started**: _______

**Steps**:
1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select device: "iPhone SE" (375 × 667)
4. Navigate to: `http://localhost:4300/direct/tchs-basketball-20260110`

**Expected Results**:
- [ ] Page adapts to mobile viewport (375px width)
- [ ] Video player scales to screen width
- [ ] Touch targets ≥ 44px (buttons easily tappable)
- [ ] Scoreboard and chat collapsed by default
- [ ] No horizontal scroll
- [ ] Text readable (≥ 16px)
- [ ] Mobile-specific hints (no keyboard shortcuts)

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

**Screenshot**: _______

---

### Phase 3: Viewer Registration & Chat

#### Test 3.1: Viewer 1 Registers for Chat
**Window**: Viewer 1 (Desktop)  
**Time Started**: _______

**Steps**:
1. Click "Expand Chat" button (→ icon on right edge)
2. Observe registration form appears
3. Fill in form:
   - **Email**: `parent@example.com`
   - **First Name**: `Sarah`
   - **Last Name**: `Johnson`
4. Click "Unlock Stream" button
5. Wait for confirmation

**Expected Results**:
- [ ] Chat panel expands smoothly
- [ ] Form has proper labels and placeholders
- [ ] Email field validates (try invalid email first)
- [ ] Form submits without page reload
- [ ] Loading indicator shows during submission
- [ ] Form disappears after success
- [ ] Chat input field appears
- [ ] Display name shows: "Sarah J."

**Time to Complete**: _______s

**Check Mailpit** (http://localhost:4304):
- [ ] Email received within 1 second
- [ ] From: `notifications@fieldview.live`
- [ ] To: `parent@example.com`
- [ ] Subject: "You're registered for TCHS Varsity Basketball vs Rival HS"
- [ ] Content: Personalized greeting "Hi Sarah,"

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

#### Test 3.2: Viewer 2 Registers (Mobile)
**Window**: Viewer 2 (Mobile)  
**Time Started**: _______

**Steps**:
1. Tap chat icon in bottom control bar (or expand chat)
2. Fill form with mobile keyboard:
   - **Email**: `alumni@example.com`
   - **First Name**: `Mike`
   - **Last Name**: `Chen`
3. Tap "Unlock Stream"

**Expected Results**:
- [ ] Form is fullscreen/modal on mobile
- [ ] Mobile keyboard appears (email keyboard for email field)
- [ ] Keyboard doesn't cover input fields
- [ ] Form submits successfully
- [ ] Keyboard dismisses after submit
- [ ] Chat interface appears
- [ ] Display name: "Mike C."

**Check Mailpit**:
- [ ] Email sent to `alumni@example.com`

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

### Phase 4: Live Chat Interaction

#### Test 4.1: Multi-User Chat
**Time Started**: _______

**Steps**:
1. **Viewer 1** types: "Go Eagles! 🦅" → Press Enter
2. Observe on all viewers (wait 2 seconds)
3. **Viewer 2** types: "Let's go Rockets! 🚀" → Press Enter
4. Observe on all viewers (wait 2 seconds)
5. Open 3rd viewer window, register as:
   - Email: `student@example.com`
   - Name: `Emma Smith`
6. **Viewer 3** types: "This is awesome!" → Press Enter
7. Observe on all viewers

**Expected Results for Each Message**:
- [ ] Message appears on sender's screen immediately
- [ ] Message appears on other screens within 2 seconds
- [ ] Display name correct (e.g., "Sarah J.")
- [ ] Messages ordered: newest at top
- [ ] No duplicate messages
- [ ] Emojis render correctly 🦅 🚀

**Message Latency Observations**:
- Message 1 latency: _______ms
- Message 2 latency: _______ms
- Message 3 latency: _______ms

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

#### Test 4.2: Chat Edge Cases
**Window**: Viewer 1  
**Time Started**: _______

**Test Cases**:

1. **Empty Message**:
   - Leave input blank → Try to send
   - **Expected**: Send button disabled ⬜ Pass ⬜ Fail

2. **Character Limit**:
   - Type 250 characters (hold 'a' key)
   - **Expected**: Input stops at 240 chars ⬜ Pass ⬜ Fail
   - **Character counter shows**: _______/240

3. **XSS Attempt**:
   - Type: `<script>alert('xss')</script>` → Send
   - **Expected**: Displays as text, no alert ⬜ Pass ⬜ Fail

4. **Special Characters**:
   - Type: `Test & "quotes" <html>` → Send
   - **Expected**: Renders safely ⬜ Pass ⬜ Fail

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

### Phase 5: Scoreboard Interaction

#### Test 5.1: Expand Scoreboard
**Window**: Viewer 1  
**Time Started**: _______

**Steps**:
1. Locate scoreboard (top-left, collapsed)
2. Click expand button (← or → arrow)
3. Observe expansion animation

**Expected Results**:
- [ ] Scoreboard expands smoothly (< 500ms animation)
- [ ] Shows full team names: "TCHS Eagles" vs "Rival Rockets"
- [ ] Shows current scores: 0 - 0
- [ ] Team colors visible: Navy blue vs Red
- [ ] Background translucent (video visible beneath)

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

#### Test 5.2: Update Score (Live Game Simulation)
**Window**: Viewer 1 (acting as admin/scorer)  
**Time Started**: _______

**Scenario**: Simulate 5 minutes of basketball

**Score Updates**:

| Time | Event | Home | Away | Verified on All Screens? |
|------|-------|------|------|-------------------------|
| 0:00 | Game starts | 0 | 0 | ⬜ |
| 1:00 | TCHS scores | 2 | 0 | ⬜ |
| 1:30 | Rival scores | 2 | 2 | ⬜ |
| 2:00 | TCHS 3-pointer | 5 | 2 | ⬜ |
| 3:00 | Rival scores | 5 | 4 | ⬜ |
| 4:00 | TCHS scores | 7 | 4 | ⬜ |

**For Each Update**:
1. Click on score (home or away)
2. Modal appears
3. Type new score
4. Press Enter or click "Save"
5. Observe update on ALL viewer screens (< 2 seconds)

**Performance**:
- Average update latency: _______ms
- Any failed updates: _______

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

### Phase 6: Fullscreen & Mobile Experience

#### Test 6.1: Fullscreen Mode (Desktop)
**Window**: Viewer 1  
**Time Started**: _______

**Steps**:
1. Press `F` key (or click fullscreen button)
2. Observe fullscreen transition
3. Move mouse → controls appear
4. Wait 5 seconds → controls auto-hide
5. Move mouse → controls reappear
6. Press `Esc` to exit fullscreen

**Expected Results**:
- [ ] Browser enters fullscreen mode
- [ ] Video expands to full screen
- [ ] Scoreboard visible as overlay (translucent)
- [ ] Chat visible as overlay (translucent)
- [ ] Mouse movement shows controls
- [ ] Controls auto-hide after 4 seconds
- [ ] Esc exits fullscreen

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

#### Test 6.2: Mobile Fullscreen
**Window**: Viewer 2 (Mobile)  
**Time Started**: _______

**Steps**:
1. Tap fullscreen button in control bar
2. Observe mobile fullscreen
3. Tap screen → controls appear
4. Wait 5 seconds → controls auto-hide
5. Tap scoreboard icon → scoreboard overlay shows
6. Tap chat icon → chat overlay shows

**Expected Results**:
- [ ] Enters fullscreen mode
- [ ] Mobile control bar at bottom
- [ ] Control bar auto-hides
- [ ] Tap shows controls
- [ ] Scoreboard accessible
- [ ] Chat accessible
- [ ] No UI behind device notch (safe area)

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

#### Test 6.3: Collapsible Panels
**Window**: Viewer 1  
**Time Started**: _______

**Steps**:
1. **Scoreboard Collapse**:
   - Click collapse button (←)
   - Observe scoreboard slides to left edge
   - Arrow now points outward (→)
2. **Scoreboard Expand**:
   - Click expand arrow (→)
   - Scoreboard slides back
3. **Refresh Page**:
   - Press F5 to reload
   - Observe scoreboard state remembered
4. **Chat Collapse** (repeat above for chat):
   - Collapse to right edge
   - Expand back
   - Verify state persistence

**Expected Results**:
- [ ] Smooth collapse animation (< 500ms)
- [ ] Arrow direction correct (→ when collapsed, ← when expanded)
- [ ] State persists after page refresh (localStorage)
- [ ] Independent collapse for scoreboard and chat

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

### Phase 7: Performance Validation

#### Test 7.1: Page Load Performance
**Window**: New incognito window  
**Time Started**: _______

**Steps**:
1. Open Chrome DevTools → Network tab
2. Clear cache (Ctrl+Shift+Delete)
3. Navigate to stream: `http://localhost:4300/direct/tchs-basketball-20260110`
4. Record "DOMContentLoaded" time
5. Record "Load" time

**Expected Results**:
- [ ] DOMContentLoaded < 2 seconds
- [ ] Full page load < 3 seconds
- [ ] All assets load successfully (no 404s)

**Actual Performance**:
- DOMContentLoaded: _______ms
- Load: _______ms
- Failed requests: _______

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

#### Test 7.2: Chat Message Latency
**Windows**: Viewer 1 + Viewer 2  
**Time Started**: _______

**Steps**:
1. Open browser DevTools console
2. Viewer 1 prepares to send message
3. Viewer 2 opens console, ready to log
4. Viewer 1: Send message with timestamp: `Test 1736537400000`
5. Viewer 2: Note time when message appears
6. Calculate latency
7. Repeat 3 times

**Latency Measurements**:
- Test 1: _______ms
- Test 2: _______ms
- Test 3: _______ms
- **Average**: _______ms

**Expected**: < 1000ms average

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

### Phase 8: Error Handling

#### Test 8.1: Stream URL Offline
**Window**: Admin  
**Time Started**: _______

**Steps**:
1. In admin panel, change stream URL to: `https://invalid.url/stream.m3u8`
2. Save changes
3. On Viewer 1, refresh page
4. Observe video player behavior

**Expected Results**:
- [ ] Video player shows error message (not crash)
- [ ] Error is user-friendly: "Stream temporarily unavailable" or similar
- [ ] Chat and scoreboard still functional
- [ ] No JavaScript errors in console

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

#### Test 8.2: Chat Connection Loss
**Window**: Viewer 1  
**Time Started**: _______

**Steps**:
1. Open DevTools → Network tab
2. Click "Offline" checkbox
3. Observe chat behavior
4. Wait 5 seconds
5. Uncheck "Offline"
6. Observe reconnection

**Expected Results**:
- [ ] Connection status shows "Disconnected" or "Offline"
- [ ] Chat input disabled during disconnection
- [ ] "Reconnecting..." indicator shows
- [ ] Automatic reconnection within 10 seconds
- [ ] Connection restores successfully
- [ ] Previous messages still visible
- [ ] New messages flow after reconnect

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

### Phase 9: Data Persistence Verification

#### Test 9.1: Database Validation
**Terminal**  
**Time Started**: _______

**SQL Queries**:

1. **Verify Stream**:
```bash
docker exec fieldview-postgres psql -U fieldview -d fieldview_dev -c "
SELECT slug, title, \"chatEnabled\", \"scoreboardEnabled\" 
FROM \"DirectStream\" 
WHERE slug = 'tchs-basketball-20260110';
"
```
**Result**: _______

2. **Verify Chat Messages**:
```bash
docker exec fieldview-postgres psql -U fieldview -d fieldview_dev -c "
SELECT COUNT(*) as message_count 
FROM \"GameChatMessage\" 
WHERE \"gameId\" = (
  SELECT \"gameId\" FROM \"DirectStream\" WHERE slug = 'tchs-basketball-20260110'
);
"
```
**Result**: _______ messages

3. **Verify Viewer Registrations**:
```bash
docker exec fieldview-postgres psql -U fieldview -d fieldview_dev -c "
SELECT email, \"firstName\", \"lastName\" 
FROM \"ViewerIdentity\" 
WHERE email IN ('parent@example.com', 'alumni@example.com', 'student@example.com');
"
```
**Result**: _______ registrations

4. **Verify Final Score**:
```bash
curl -s http://localhost:4301/api/direct/tchs-basketball-20260110/scoreboard | jq
```
**Result**: Home: _______ Away: _______

**Status**: ⬜ Pass  ⬜ Fail  ⬜ Blocked

---

## 📊 TEST SUMMARY

### Test Execution Metrics

| Phase | Tests | Passed | Failed | Blocked | Pass Rate |
|-------|-------|--------|--------|---------|-----------|
| 1. Stream Creation | 3 | ___ | ___ | ___ | ___% |
| 2. Viewer Access | 2 | ___ | ___ | ___ | ___% |
| 3. Registration | 2 | ___ | ___ | ___ | ___% |
| 4. Chat | 2 | ___ | ___ | ___ | ___% |
| 5. Scoreboard | 2 | ___ | ___ | ___ | ___% |
| 6. Fullscreen/Mobile | 3 | ___ | ___ | ___ | ___% |
| 7. Performance | 2 | ___ | ___ | ___ | ___% |
| 8. Error Handling | 2 | ___ | ___ | ___ | ___% |
| 9. Data Persistence | 1 | ___ | ___ | ___ | ___% |
| **TOTAL** | **19** | **___** | **___** | **___** | **___%** |

### Performance Summary

- **Page Load Time**: _______ms (Target: < 3000ms)
- **Chat Latency**: _______ms avg (Target: < 1000ms)
- **Score Update**: _______ms avg (Target: < 2000ms)
- **Concurrent Viewers**: _______ (Target: 3+)

### Critical Issues Found

1. **Issue**: _________________________________  
   **Severity**: ⬜ Critical ⬜ High ⬜ Medium ⬜ Low  
   **Steps to Reproduce**: _________________________________

2. **Issue**: _________________________________  
   **Severity**: ⬜ Critical ⬜ High ⬜ Medium ⬜ Low  
   **Steps to Reproduce**: _________________________________

3. **Issue**: _________________________________  
   **Severity**: ⬜ Critical ⬜ High ⬜ Medium ⬜ Low  
   **Steps to Reproduce**: _________________________________

### Overall Assessment

**Production Ready?** ⬜ Yes ⬜ No ⬜ With Fixes

**Tester Signature**: _______________ **Date**: _______________

**Next Steps**:
- [ ] File GitHub issues for all bugs
- [ ] Prioritize fixes by severity
- [ ] Re-test after fixes
- [ ] Performance optimization (if needed)
- [ ] User acceptance testing

---

## 📎 Attachments

- Screenshots: _________________________________
- Screen recordings: _________________________________
- Console logs: _________________________________
- Network HAR files: _________________________________

---

**End of Manual Test Script**

