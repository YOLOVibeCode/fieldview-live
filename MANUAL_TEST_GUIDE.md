# Manual Test Guide - Scoreboard Tap-to-Edit Feature

**Feature**: Fullscreen Scoreboard with Tap-to-Edit Scores  
**Date**: January 13, 2026  
**Status**: Ready for Manual Testing

---

## 🎯 **What We're Testing**

1. Score tap-to-edit functionality in fullscreen mode
2. Team name display above scores
3. Authentication enforcement (only registered users can edit)
4. ScoreEditModal behavior and score updates
5. Visual feedback (hover effects, transitions)

---

## 🧪 **Test Scenarios**

### **Test 1: Unregistered User (Cannot Edit Scores)**

**URL**: http://localhost:4300/direct/tchs/soccer-20260113-varsity

**Steps**:
1. Open the URL in a browser (Chrome/Safari/Firefox)
2. Video should auto-play (or click to play)
3. Press **F** key to enter fullscreen
4. Press **S** key to expand scoreboard (or click "Expand scoreboard" button)
5. **Observe** the scoreboard:
   - ✅ Team names should appear above scores (uppercase, small font)
   - ✅ Scores should be visible (large bold numbers)
   - ✅ Scoreboard should be draggable
6. **Try to click** on a score (home or away)
   - ❌ **Expected**: Nothing happens (scores are NOT clickable)
   - ❌ **Expected**: No hover effect on scores
7. Check footer hint text
   - ✅ Should show "Press [S] to toggle" and "Drag header to reposition"
   - ❌ Should **NOT** show "Tap scores to edit"

**Pass Criteria**: Scores are visible but not interactive for unregistered users.

---

### **Test 2: Registered User (Can Edit Scores)**

**URL**: http://localhost:4300/direct/tchs/soccer-20260113-varsity

**Steps**:
1. Open the URL in a browser
2. Press **C** key to expand chat (or click "Expand chat" button)
3. **Register as a viewer**:
   - Email: `test@example.com`
   - First Name: `Test`
   - Last Name: `User`
   - Click "Unlock stream"
4. Wait for registration to complete
5. Press **F** key to enter fullscreen
6. Press **S** key to expand scoreboard
7. **Hover over** a score (home or away)
   - ✅ **Expected**: Score should scale up slightly (`hover:scale-110`)
   - ✅ **Expected**: Cursor should be `pointer`
8. **Click** on the home score (left side)
   - ✅ **Expected**: `ScoreEditModal` appears
   - ✅ **Expected**: Current score is pre-filled in input
   - ✅ **Expected**: Input is auto-focused and selected
9. **Type a new score**: Enter `7`
10. **Click "Save"** button
    - ✅ **Expected**: Modal closes
    - ✅ **Expected**: Home score updates to `7` on scoreboard
    - ✅ **Expected**: No errors in console
11. **Click** on the away score (right side)
    - ✅ **Expected**: Modal appears again
12. **Type a new score**: Enter `3`
13. **Click "Save"** button
    - ✅ **Expected**: Modal closes
    - ✅ **Expected**: Away score updates to `3` on scoreboard
14. Check footer hint text
    - ✅ Should show "Tap scores to edit" (new hint)

**Pass Criteria**: 
- Registered users can click scores
- Modal appears with correct data
- Scores update successfully
- No console errors

---

### **Test 3: Modal Behavior (Edge Cases)**

**Setup**: Registered user, fullscreen, scoreboard expanded

**Steps**:
1. Click on home score
2. **Without changing the value**, click "Cancel"
   - ✅ **Expected**: Modal closes
   - ✅ **Expected**: Score remains unchanged
3. Click on home score again
4. **Clear the input** (delete all text)
5. Click "Save"
   - ✅ **Expected**: Score updates to `0`
6. Click on home score again
7. **Enter invalid input**: Type `abc`
   - ✅ **Expected**: Input should only accept numbers
8. Click on home score again
9. **Enter large number**: Type `999`
10. Click "Save"
    - ✅ **Expected**: Score updates to `999` (max value)
11. Click on home score again
12. **Enter negative number**: Type `-5`
    - ✅ **Expected**: Score should be clamped to `0` (min value)
13. Press **Escape** key while modal is open
    - ✅ **Expected**: Modal closes

**Pass Criteria**: Modal handles all edge cases gracefully.

---

### **Test 4: Team Name Display**

**URL**: http://localhost:4300/direct/tchs/soccer-20260113-varsity

**Steps**:
1. Open URL, enter fullscreen, expand scoreboard
2. **Observe team names**:
   - ✅ Home team name: "TWIN CITIES" (or configured name)
   - ✅ Away team name: "OPPONENT" (or configured name)
3. **Check styling**:
   - ✅ Font size: Small (text-sm)
   - ✅ Font weight: Semibold
   - ✅ Text color: White with drop shadow
   - ✅ Transform: Uppercase
   - ✅ Position: **Above** the score number
4. **Check layout**:
   - ✅ Team name → Score (vertically stacked)
   - ✅ Home team card (left) | VS | Away team card (right)

**Pass Criteria**: Team names are clearly visible and properly styled.

---

### **Test 5: Mobile Responsive Behavior**

**URL**: http://localhost:4300/direct/tchs/soccer-20260113-varsity

**Steps (Mobile Device or Responsive Mode)**:
1. Open URL on mobile device or use browser dev tools responsive mode
2. Set viewport to iPhone 13 Pro (390x844)
3. Register as viewer (tap chat, enter details)
4. Tap fullscreen button
5. Tap "Expand scoreboard" button (bottom left)
6. **Tap** on a score
   - ✅ **Expected**: Modal appears (mobile-optimized)
   - ✅ **Expected**: Input is auto-focused with keyboard
7. Enter new score using mobile keyboard
8. Tap "Save"
   - ✅ **Expected**: Score updates
   - ✅ **Expected**: Modal closes
9. **Drag scoreboard** around the screen
   - ✅ **Expected**: Scoreboard moves with touch drag
10. **Pinch to zoom** while scoreboard is visible
    - ✅ **Expected**: Scoreboard remains positioned correctly

**Pass Criteria**: All interactions work smoothly on mobile.

---

### **Test 6: Multi-User Real-Time Sync**

**Setup**: Two browser windows/tabs

**Steps**:
1. **Window 1**: Open http://localhost:4300/direct/tchs/soccer-20260113-varsity
   - Register as `user1@test.com`
   - Enter fullscreen, expand scoreboard
2. **Window 2**: Open same URL in incognito/private window
   - Register as `user2@test.com`
   - Enter fullscreen, expand scoreboard
3. **Window 1**: Click home score, change to `10`, save
4. **Window 2**: Wait 2-4 seconds (polling interval)
   - ✅ **Expected**: Home score updates to `10` automatically
5. **Window 2**: Click away score, change to `5`, save
6. **Window 1**: Wait 2-4 seconds
   - ✅ **Expected**: Away score updates to `5` automatically

**Pass Criteria**: Score changes sync across all viewers.

---

## 🔍 **Visual Inspection Checklist**

### **Scoreboard Layout**
- [ ] Scoreboard is draggable (header shows drag cursor)
- [ ] Collapse button visible (top-right)
- [ ] Team names above scores (small, uppercase)
- [ ] Scores large and bold
- [ ] "VS" divider between teams
- [ ] Clock display at bottom
- [ ] Footer hints visible

### **Interactive Scores (Registered Users)**
- [ ] Hover effect: slight scale-up on scores
- [ ] Active effect: slight scale-down on click
- [ ] Cursor changes to pointer on hover
- [ ] Modal appears centered on screen
- [ ] Modal backdrop dims the background

### **ScoreEditModal**
- [ ] Modal title shows team name (e.g., "Edit TWIN CITIES Score")
- [ ] Current score pre-filled in input
- [ ] Input is focused and selected (text highlighted)
- [ ] "Save" and "Cancel" buttons visible
- [ ] Buttons have proper styling and hover effects

---

## 🐛 **Console Error Check**

Open browser DevTools console (F12 → Console tab) and check for errors:

### **Expected Warnings (OK to Ignore)**
```
Download the React DevTools...
Play failed: [DOMException]
```

### **Errors to Watch For (Should NOT appear)**
```
❌ Failed to update score
❌ TypeError: Cannot read property 'homeScore'
❌ 401 Unauthorized
❌ Network request failed
```

---

## 📸 **Screenshot Checklist**

Take screenshots for documentation:

1. **Unregistered user**: Scoreboard with non-clickable scores
2. **Registered user**: Scoreboard with hover effect on score
3. **Modal open**: ScoreEditModal with input focused
4. **Updated score**: Scoreboard showing new score after save
5. **Mobile view**: Scoreboard on mobile device
6. **Team names**: Close-up of team name display

---

## ✅ **Test Completion Report**

After completing all tests, fill out:

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Unregistered User | ⬜ PASS / ⬜ FAIL | |
| Test 2: Registered User | ⬜ PASS / ⬜ FAIL | |
| Test 3: Modal Edge Cases | ⬜ PASS / ⬜ FAIL | |
| Test 4: Team Name Display | ⬜ PASS / ⬜ FAIL | |
| Test 5: Mobile Responsive | ⬜ PASS / ⬜ FAIL | |
| Test 6: Multi-User Sync | ⬜ PASS / ⬜ FAIL | |

**Overall Status**: ⬜ READY TO DEPLOY / ⬜ NEEDS FIXES

**Issues Found**:
(List any bugs or issues discovered during testing)

---

## 🚀 **Deployment Approval**

Once all tests pass:

```bash
# Push to main (triggers Railway auto-deploy)
git push origin main

# Monitor deployment
./scripts/railway-logs.sh tail api
```

---

**Prepared by**: Software Engineer  
**Reviewed by**: (Awaiting manual test completion)  
**Approved for deployment**: ⬜ YES / ⬜ NO

