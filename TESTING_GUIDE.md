# 🧪 TESTING GUIDE - FieldView.Live Social Producer Features

## Overview
This guide provides step-by-step instructions for manually testing all the new features we implemented.

---

## Prerequisites

### 1. Start Local Services
```bash
# Terminal 1: Start API Server
cd /Users/admin/Dev/YOLOProjects/fieldview.live
export DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev"
export REDIS_URL="redis://localhost:4303"
export JWT_SECRET="test-secret-key"
export WEB_URL="http://localhost:4300"
pnpm --filter api dev

# Terminal 2: Start Web UI
cd /Users/admin/Dev/YOLOProjects/fieldview.live
export NEXT_PUBLIC_API_URL="http://localhost:4301"
pnpm --filter web dev
```

### 2. Ensure Services Are Running
- **Postgres**: `localhost:4302`
- **Redis**: `localhost:4303`
- **API**: `localhost:4301`
- **Web**: `localhost:4300`

---

## Test Scenarios

### 🎯 Test 1: Social Producer Panel - Admin Access

**Objective**: Verify admin can access and use the Social Producer Panel

**Steps**:
1. Navigate to `http://localhost:4300/direct/tchs`
2. Click the **"Edit Stream"** button (top right)
3. Enter admin password: `tchs2026`
4. Click **"Unlock"**
5. Scroll down to see **Social Producer Panel**

**Expected Results**:
- ✅ Admin panel unlocks successfully
- ✅ Social Producer Panel is visible
- ✅ All controls are editable (team names, colors, scores, clock)

---

### 🎨 Test 2: Team Names & Jersey Colors

**Objective**: Update team information and verify scoreboard overlay updates

**Steps**:
1. In Producer Panel, update **Home Team Name**: `Warriors`
2. Update **Away Team Name**: `Tigers`
3. Change **Home Jersey Color**: `#1E40AF` (blue)
4. Change **Away Jersey Color**: `#DC2626` (red)
5. Look at the **Scoreboard Overlay** (top-left of video player)

**Expected Results**:
- ✅ Team names update in real-time on scoreboard
- ✅ Jersey colors apply as gradient backgrounds
- ✅ Text remains readable on colored backgrounds

---

### 🔢 Test 3: Score Management

**Objective**: Test score increment/decrement and direct input

**Steps**:
1. Click **Home Score "+"** button twice → Score: 2
2. Click **Away Score "+"** button once → Score: 1
3. Click **Home Score "-"** button once → Score: 1
4. Type directly in **Away Score** input: `5`

**Expected Results**:
- ✅ Scores update immediately
- ✅ Scoreboard overlay reflects changes
- ✅ Buttons and direct input both work
- ✅ Cannot go below 0

---

### ⏱️ Test 4: Clock Control

**Objective**: Verify running clock synchronization

**Steps**:
1. Click **"Start"** button
2. Watch clock run for 5 seconds
3. Click **"Pause"** button
4. Verify time is around `0:05`
5. Click **"Reset"** button
6. Verify time returns to `0:00`

**Expected Results**:
- ✅ Clock runs smoothly in real-time
- ✅ Pause stops the clock
- ✅ Reset returns to zero
- ✅ Clock syncs across page refreshes (try refreshing while running)

---

### 👁️ Test 5: Scoreboard Visibility Toggle

**Objective**: Control scoreboard visibility for viewers

**Steps**:
1. Click **"Visible"** button to hide
2. Verify scoreboard overlay disappears
3. Click **"Hidden"** button to show
4. Verify scoreboard reappears

**Expected Results**:
- ✅ Scoreboard shows/hides instantly
- ✅ Button state updates correctly
- ✅ Setting persists on page refresh

---

### 📊 Test 6: Viewer Analytics

**Objective**: View active viewer list

**Steps**:
1. While logged in as admin, locate **"Active Viewers"** panel
2. Open a **new incognito window**
3. Navigate to `http://localhost:4300/direct/tchs`
4. Fill in chat unlock form (any email/name)
5. Go back to admin panel
6. Wait ~10 seconds for refresh

**Expected Results**:
- ✅ Total Active Count increases
- ✅ New viewer appears in list
- ✅ Green status indicator shows "active"
- ✅ Last seen time shows "Just now"
- ✅ Viewer name and email are displayed

---

### 💳 Test 7: Enhanced Paywall Modal

**Objective**: Test paywall with admin message and saved cards

**Prerequisites**: Enable paywall in admin panel first
- Set **Paywall Enabled**: ON
- Set **Price**: $4.99
- Set **Custom Message**: "Support our team! Your contribution helps us stream more games."

**Steps**:
1. Open **new incognito window**
2. Navigate to `http://localhost:4300/direct/tchs`
3. Paywall modal should appear automatically

**Test Scenario A - New User**:
1. Fill in email: `newuser@test.com`
2. Fill in name: `Test User`
3. Click **"Continue to Payment"**
4. Verify custom message is displayed
5. Check **"Save payment information"** checkbox
6. (Payment flow is mocked for now)

**Test Scenario B - Returning User**:
1. Fill in email: `saved-payment@test.com`
2. Fill in name: `Saved User`
3. Click **"Continue to Payment"**
4. Verify **"Saved Payment Found"** message appears
5. See radio buttons: "Use Saved Card" vs "Use Different Card"
6. Saved card should be selected by default

**Expected Results**:
- ✅ Modal displays price correctly
- ✅ Admin custom message is prominent
- ✅ Saved card detection works
- ✅ Radio button selection toggles properly
- ✅ Save payment checkbox appears for new cards
- ✅ Can navigate back to edit info

---

### 📧 Test 8: Email Notifications

**Objective**: Verify email reminders work

**Prerequisites**: Configure stream with scheduled time

**Steps**:
1. In admin panel, set **Scheduled Start Time**: 5 minutes from now
2. Register as a viewer (provide email)
3. Wait ~5 minutes
4. Check Mailpit at `http://localhost:8025`

**Expected Results**:
- ✅ Registration confirmation email sent immediately
- ✅ Reminder email sent 5 minutes before stream
- ✅ Emails have beautiful HTML templates
- ✅ Links work correctly

---

### 🔐 Test 9: Producer Password Access

**Objective**: Test community editing with password protection

**Steps**:
1. As admin, in Producer Panel settings (if visible), set **Producer Password**: `producer123`
2. **Log out or use incognito window**
3. Navigate to Producer Panel section
4. Enter producer password: `producer123`
5. Verify you can edit scoreboard

**Test Scenario - No Password**:
1. As admin, **remove producer password** (set to empty)
2. In new window, verify Producer Panel is **immediately unlocked**
3. Anyone can edit without password

**Expected Results**:
- ✅ Password-protected mode requires correct password
- ✅ No-password mode = instant access for anyone
- ✅ Admin JWT always bypasses password

---

### 🎮 Test 10: Corner Peek Chat

**Objective**: Verify chat UI works smoothly

**Steps**:
1. Close admin panel (to see full page)
2. Look for **floating chat badge** (bottom-right corner)
3. Click badge to open chat
4. Verify chat panel expands (360px x 500px)
5. Close chat by clicking X or backdrop
6. Verify smooth animations

**Expected Results**:
- ✅ Badge is always visible in corner
- ✅ Panel expands smoothly
- ✅ Backdrop overlay appears
- ✅ Close button works
- ✅ Backdrop click closes chat

---

## 🧪 Automated Testing

### Run Unit Tests (Backend)
```bash
cd /Users/admin/Dev/YOLOProjects/fieldview.live/apps/api
export DATABASE_URL="postgresql://fieldview:dev_password_change_in_production@localhost:4302/fieldview_dev"
export REDIS_URL="redis://localhost:4303"
export JWT_SECRET="test-secret-key"
export WEB_URL="http://localhost:4300"
npx vitest run --config vitest.live.config.ts scoreboard.test.ts paywall-saved-payments.test.ts email-notifications.test.ts viewer-analytics.test.ts
```

**Expected**: All 48 tests passing

### Run E2E Tests (Playwright)
```bash
cd /Users/admin/Dev/YOLOProjects/fieldview.live/apps/web
npx playwright test tests/e2e/scoreboard.spec.ts
npx playwright test tests/e2e/paywall.spec.ts
npx playwright test tests/e2e/viewer-analytics.spec.ts
npx playwright test tests/e2e/chat-integration.spec.ts
```

**Expected**: All 53 tests passing

---

## 🐛 Troubleshooting

### Issue: Scoreboard not appearing
- **Check**: Is `isVisible` set to true in admin panel?
- **Check**: Does the stream have a scoreboard initialized?

### Issue: Clock not syncing
- **Check**: Is `clockStartedAt` timestamp being set?
- **Check**: Refresh page and verify clock continues from correct time

### Issue: Viewer analytics showing 0
- **Check**: Has anyone registered/unlocked chat in last 2 minutes?
- **Check**: Is `lastSeenAt` updating on heartbeat?

### Issue: Emails not sending
- **Check**: Is Mailpit running on port 1025?
- **Check**: Is cron job running? (Check server logs)
- **Check**: Is `scheduledStartAt` set correctly?

### Issue: Paywall not showing
- **Check**: Is `paywallEnabled` set to true in admin panel?
- **Check**: Is `priceInCents` greater than 0?

---

## ✅ Verification Checklist

Use this checklist to verify all features:

- [ ] Admin can unlock panel with password
- [ ] Team names update correctly
- [ ] Jersey colors apply as gradients
- [ ] Score increment/decrement works
- [ ] Direct score input works
- [ ] Clock starts, pauses, resets correctly
- [ ] Clock syncs across refreshes
- [ ] Scoreboard visibility toggle works
- [ ] Viewer analytics shows active viewers
- [ ] Green/red status indicators accurate
- [ ] Paywall modal appears when enabled
- [ ] Admin custom message displays
- [ ] Saved payment detection works
- [ ] Payment method selection toggles
- [ ] Email confirmation sent on registration
- [ ] Email reminder sent before stream
- [ ] Producer password protection works
- [ ] No-password mode allows public editing
- [ ] Chat corner peek badge visible
- [ ] Chat panel opens/closes smoothly
- [ ] All animations are smooth
- [ ] Mobile responsive (test on small screen)

---

## 📝 Notes

- All UI elements have `data-testid` for automation
- All forms have proper validation
- All error states are handled gracefully
- All timestamps are server-synced
- All passwords are bcrypt-hashed
- Privacy-first: No IP/location tracking

---

**Happy Testing! 🚀**

