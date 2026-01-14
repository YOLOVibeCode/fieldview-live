# Issue Analysis: Scoreboard Score Update & Team Name Display

**Date**: January 13, 2026  
**Issue Reporter**: User  
**Status**: 🔍 **INVESTIGATING**

---

## 🐛 **Reported Issues**

### **Issue 1: Cannot Update Score Locally**
> "I'm trying to update locally the score report, and I cannot."

**Possible Causes:**
1. User is not registered/unlocked (scores only editable when `viewer.isUnlocked = true`)
2. Scoreboard not visible or `canEditScore` prop not set correctly
3. Stream not configured properly (no stream URL)
4. Browser/JavaScript error preventing interaction

### **Issue 2: Team Name Placement**
> "I went back to be able to...affect the team."

**Current Implementation:**
- Team names are displayed **ABOVE** scores (not below)
- Format:
  ```
  TWIN CITIES    ← Team name (small, above)
       5         ← Score (large, clickable)
  ```

**User May Want:**
- Team names **BELOW** scores for better clarity
- Or larger/more prominent team names

### **Issue 3: Real-Time Updates**
> "affects everybody else in the CA real-time. Where they don't have to update it"

**Current Implementation:**
- Scores update via **polling** (2-4 second interval)
- When one user updates score, others see it within 2-4 seconds
- This is NOT instant WebSocket real-time, but periodic refresh

**User May Want:**
- Instant real-time updates (WebSocket-based)
- Or confirmation that polling works correctly

---

## 🔍 **Investigation Steps**

### **Step 1: Check If User Is Registered**

For score editing to work, user MUST:
1. Click "Expand chat" button
2. Enter email, first name, last name
3. Click "Unlock stream"
4. Wait for registration success

**Without registration**: Scores are NOT clickable (by design for security)

### **Step 2: Check Stream Configuration**

The stream needs:
- `chatEnabled: true`
- `scoreboardEnabled: true`
- Valid scoreboard team names and colors
- Stream URL (optional, but affects "Stream Offline" message)

### **Step 3: Verify Scoreboard Visibility**

Check if scoreboard appears:
- Non-fullscreen: Should show at top-left by default
- Fullscreen: Press `S` key to expand scoreboard
- Look for collapse/expand button

---

## 🎯 **Proposed Solutions**

### **Solution A: Move Team Names Below Scores**

**Change:**
```typescript
// Current (team name ABOVE score):
<div className="team-name">{scoreboard.homeTeamName}</div>
<button className="score">{scoreboard.homeScore}</button>

// Proposed (team name BELOW score):
<button className="score">{scoreboard.homeScore}</button>
<div className="team-name">{scoreboard.homeTeamName}</div>
```

**Visual:**
```
┌──────────────────┐
│       5          │ ← Score (large, clickable)
│  TWIN CITIES     │ ← Team name (small, below)
└──────────────────┘
```

**Pros:**
- Score more prominent (user's focus)
- Team name still visible for context

**Cons:**
- Unusual design pattern (most scoreboards show team first)

### **Solution B: Make Team Names Larger/More Prominent**

Keep team names above scores but make them more visible:
- Increase font size: `text-xs` → `text-sm`
- Add background highlight
- Bold or different color

### **Solution C: Add Team Name Tooltip on Hover**

Keep current layout but add tooltip showing team name when hovering score:
```typescript
<button
  title={`Edit ${scoreboard.homeTeamName} score`}
  onClick={() => handleScoreTap('home')}
>
  {scoreboard.homeScore}
</button>
```

---

## 🧪 **Debugging Steps**

### **Test 1: Verify Registration**

```bash
# Open browser console (F12)
# Check localStorage for viewer token:
localStorage.getItem('viewer-identity')

# Should show something like:
# {"token":"eyJhbGc...", "email":"test@example.com", ...}
```

If empty → User not registered

### **Test 2: Verify Scoreboard API**

```bash
# Check API response:
curl http://localhost:4301/api/direct/tchs/scoreboard

# Should return:
# {
#   "homeTeamName": "Twin Cities",
#   "awayTeamName": "Opponent",
#   "homeScore": 0,
#   "awayScore": 0,
#   "isVisible": true,
#   ...
# }
```

If `isVisible: false` → Scoreboard disabled

### **Test 3: Check Console Errors**

```bash
# Open browser console (F12 → Console tab)
# Look for errors like:
# - "Failed to update score"
# - "401 Unauthorized"
# - "Cannot read property..."
```

### **Test 4: Verify canEditScore Prop**

```typescript
// In DirectStreamPageBase.tsx:
<ScoreboardOverlay
  slug={bootstrap?.slug || ''}
  canEditScore={viewer.isUnlocked}  // ← Should be TRUE when registered
/>
```

Check browser console:
```javascript
// Add temporary debug:
console.log('canEditScore:', viewer.isUnlocked);
console.log('viewer:', viewer);
```

---

## 📋 **Questions for User**

To better understand the issue, please answer:

1. **Are you registered as a viewer?**
   - Did you enter email/name in chat?
   - Do you see a token in localStorage?

2. **Is the scoreboard visible?**
   - Do you see the scoreboard component on screen?
   - Are team names and scores visible?

3. **What happens when you click a score?**
   - Nothing at all?
   - Modal opens but won't save?
   - Error in console?

4. **Which view are you using?**
   - Regular view (non-fullscreen)?
   - Fullscreen view?

5. **About team names:**
   - Do you want team names BELOW scores instead of above?
   - Or do you want them larger/more visible?
   - Or something else?

6. **About real-time updates:**
   - Are updates not appearing at all?
   - Or do they appear but too slowly?
   - Do you need instant WebSocket updates?

---

## 🚀 **Next Steps**

**Option 1: Quick Fix - Move Team Names Below Scores**
- Modify `ScoreboardOverlay.tsx` to swap team name and score order
- 5-10 minutes implementation
- Visual design change

**Option 2: Debug Current Issue**
- Test registration flow
- Check API responses
- Verify `canEditScore` prop
- Fix any bugs found

**Option 3: Enhance Real-Time Updates**
- Reduce polling interval (2s → 1s)
- Add visual indicator when score updates
- Or implement WebSocket for instant updates (larger effort)

---

**Please provide more details about the specific issue you're experiencing, and I'll fix it immediately!**

Specifically:
1. Can you click on the scores at all? (Are they interactive?)
2. If you can click, does a modal appear?
3. Are you registered (did you enter your email/name)?
4. Do you want team names below scores instead of above?

