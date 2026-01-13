# 🚀 Direct Stream UX Test Plan - READY TO EXECUTE

**Date**: January 10, 2026 @ 13:26 PST  
**Status**: ✅ **IMPLEMENTATION COMPLETE** - Ready for Testing  
**Engineer**: Software Engineer (implementing Architect's plan)

---

## ✅ Pre-Flight Status

### Services Status
- ✅ API: `http://localhost:4301` - **HEALTHY**
- ✅ Web: `http://localhost:4300` - **RUNNING**
- ✅ PostgreSQL: Docker container - **UP**
- ✅ Redis: Docker container - **UP**
- ✅ Mailpit: `http://localhost:4304` - **UP**

### Test Data Status
- ✅ Test stream seeded: `tchs-basketball-20260110`
- ✅ Owner account created: `admin@fieldview.live`
- ✅ Game entity created for chat backend
- ✅ Scoreboard created: TCHS Eagles (0) vs Rival Rockets (0)
- ✅ Bootstrap verified:
  ```json
  {
    "title": "TCHS Varsity Basketball vs Rival HS",
    "chatEnabled": true,
    "scoreboardEnabled": true,
    "gameId": "f0b8d071-7126-4685-9408-c5899ef1c8a0"
  }
  ```

---

## 🎯 Test Stream URLs

**Viewer Stream Page**:
```
http://localhost:4300/direct/tchs-basketball-20260110
```

**Admin Panel** (if needed):
```
http://localhost:4300/admin/direct-streams
```

**Email Testing (Mailpit)**:
```
http://localhost:4304
```

---

## 🧪 Testing Options

### Option 1: Automated E2E Tests (Recommended First)

**Run the full Playwright test suite**:
```bash
./scripts/test-direct-stream-ux.sh
# Choose option: 1 (Automated E2E tests)
```

**Or run Playwright directly**:
```bash
pnpm playwright test tests/e2e/direct-stream-complete-ux.spec.ts --headed
```

**Expected Duration**: ~5-10 minutes

**What it tests**:
- ✅ Stream creation and configuration
- ✅ Viewer access (desktop & mobile simulation)
- ✅ Email registration workflow
- ✅ Multi-user chat (3 concurrent viewers)
- ✅ Scoreboard updates and synchronization
- ✅ Fullscreen mode
- ✅ Collapsible panels
- ✅ Performance metrics (page load, chat latency, score updates)
- ✅ Data persistence

---

### Option 2: Manual UX Testing

**Follow the comprehensive manual test script**:
```bash
./scripts/test-direct-stream-ux.sh
# Choose option: 2 (Manual testing)
# Browser windows will open automatically
```

**Manual Script Location**:
```
MANUAL_TEST_SCRIPT_DIRECT_STREAM_UX.md
```

**Expected Duration**: ~90 minutes (full walkthrough)

**Test Scenario**: "Friday Night Varsity Basketball Game"
- Admin creates and configures stream
- 3 viewers register with email
- Real-time chat interaction
- Live score updates (simulating game play)
- Fullscreen and mobile experience
- Error handling and reconnection

**Test Viewers** (use these emails):
1. `parent@example.com` - Sarah Johnson (Desktop)
2. `alumni@example.com` - Mike Chen (Mobile)
3. `student@example.com` - Emma Smith (Tablet)

---

### Option 3: Quick Smoke Test (5 minutes)

**Verify core functionality quickly**:

1. **Open stream page**:
   ```
   http://localhost:4300/direct/tchs-basketball-20260110
   ```

2. **Register for chat**:
   - Click "Expand Chat"
   - Enter email: `test@example.com`
   - Enter name: `Test User`
   - Click "Unlock Stream"

3. **Check Mailpit**:
   ```
   http://localhost:4304
   ```
   - Verify email received within 1 second

4. **Send a chat message**:
   - Type: "Test message"
   - Press Enter
   - Verify message appears

5. **Expand scoreboard**:
   - Click scoreboard expand button
   - Verify team names: "TCHS Eagles" vs "Rival Rockets"
   - Verify score: 0 - 0

6. **Test fullscreen**:
   - Press `F` key
   - Verify fullscreen mode
   - Press `Esc` to exit

**Result**: If all 6 steps work, core functionality is ✅

---

## 📊 Test Reports

### After E2E Tests

**View Playwright HTML report**:
```bash
pnpm playwright show-report
```

**Check for failures**:
- Green checkmarks = Pass ✅
- Red X = Failure ❌
- Yellow = Skipped ⏭️

### After Manual Tests

**Fill out the test report**:
```
TEST_REPORT_TEMPLATE.md
```

**Include**:
- Pass/fail counts
- Performance metrics
- Screenshots of key features
- Any bugs found
- UX assessment

---

## 🐛 Troubleshooting

### If E2E Tests Fail

1. **Check services are running**:
   ```bash
   curl http://localhost:4301/health
   curl http://localhost:4300
   ```

2. **Re-seed test data**:
   ```bash
   pnpm tsx scripts/seed-test-stream.ts
   ```

3. **Check Playwright browsers**:
   ```bash
   pnpm playwright install
   ```

4. **Run single test for debugging**:
   ```bash
   pnpm playwright test tests/e2e/direct-stream-complete-ux.spec.ts -g "Phase 1.1"
   ```

### If Manual Tests Fail

1. **Clear browser cache**: Ctrl+Shift+Delete
2. **Clear localStorage**: DevTools → Application → Local Storage → Clear All
3. **Check Mailpit**: Ensure emails are arriving at http://localhost:4304
4. **Verify stream data**:
   ```bash
   curl http://localhost:4301/api/direct/tchs-basketball-20260110/bootstrap | jq
   ```

### Common Issues

| Issue | Solution |
|-------|----------|
| Stream not loading | Check API is running on 4301 |
| Chat not working | Verify `chatEnabled: true` in bootstrap |
| Scoreboard not showing | Verify `scoreboardEnabled: true` in bootstrap |
| Email not received | Check Mailpit UI at localhost:4304 |
| Registration fails | Check browser console for errors |

---

## 📈 Success Metrics

### Must Pass (Critical)
- [ ] Stream page loads within 3 seconds
- [ ] Email registration completes successfully
- [ ] Email delivered within 1 second
- [ ] Chat messages propagate within 1 second
- [ ] Score updates propagate within 2 seconds
- [ ] Fullscreen mode works
- [ ] Mobile viewport adapts correctly (375px width)

### Should Pass (High Priority)
- [ ] Collapsible panels remember state
- [ ] Chat handles 3+ concurrent users
- [ ] No console errors
- [ ] No horizontal scroll on mobile
- [ ] Touch targets ≥ 44px
- [ ] Keyboard navigation works

### Nice to Have (Medium Priority)
- [ ] Page load < 2 seconds (vs target of 3s)
- [ ] Chat latency < 500ms (vs target of 1s)
- [ ] Smooth animations (60fps)
- [ ] Graceful reconnection after network loss

---

## 🎬 Ready to Test!

**Everything is set up and ready. Choose your testing approach:**

1. **Quick validation** → Option 3: Smoke Test (5 min)
2. **Thorough automated** → Option 1: E2E Tests (10 min)
3. **Complete UX** → Option 2: Manual Testing (90 min)
4. **Full coverage** → Run Option 1 THEN Option 2

**Recommended Flow**:
```bash
# Step 1: Run automated tests first
./scripts/test-direct-stream-ux.sh
# → Choose option 1

# Step 2: Review results
pnpm playwright show-report

# Step 3: If E2E passes, do manual UX validation
./scripts/test-direct-stream-ux.sh
# → Choose option 2

# Step 4: Fill out test report
# → TEST_REPORT_TEMPLATE.md

# Step 5: Fix any bugs, then re-test
```

---

## 📋 Files Created

All test infrastructure files are in place:

1. ✅ `tests/e2e/direct-stream-complete-ux.spec.ts` - E2E test suite (19 tests)
2. ✅ `MANUAL_TEST_SCRIPT_DIRECT_STREAM_UX.md` - Manual test checklist
3. ✅ `scripts/seed-test-stream.ts` - Test data seeding
4. ✅ `scripts/test-direct-stream-ux.sh` - Test execution helper
5. ✅ `TEST_REPORT_TEMPLATE.md` - Test report template
6. ✅ `DIRECT_STREAM_UX_TEST_IMPLEMENTATION.md` - Implementation docs
7. ✅ `DIRECT_STREAM_UX_TEST_EXECUTION_READY.md` - This file

---

## 🚀 Execute Now

**Start testing with a single command**:

```bash
./scripts/test-direct-stream-ux.sh
```

**Or directly test the stream**:

```bash
open http://localhost:4300/direct/tchs-basketball-20260110
```

---

**Status**: 🟢 **ALL SYSTEMS GO** - Ready for comprehensive UX testing!

**Test Stream**: `tchs-basketball-20260110` is live and configured.

**Next Action**: Execute tests and validate the complete direct stream user experience! 🎉

---

_Test infrastructure implemented and validated on January 10, 2026_

