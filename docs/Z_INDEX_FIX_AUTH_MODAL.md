# Z-Index Layering Fix - Authentication Modal

## 🐛 Issue

The viewer authentication modal (registration form) was appearing **behind** the scoreboard (left) and chat (right) panels, making it impossible for users to interact with the registration form.

### Screenshot of Issue
User reported that when clicking "Register to Chat", the modal appeared but was blocked by:
- Scoreboard panel on the left
- Chat panel on the right

This made the form inputs and buttons inaccessible.

---

## 🔍 Root Cause

**Z-index conflict in the component layering:**

### Before (Broken):
```
Scoreboard Panel:  z-40
Chat Panel:        z-50
Auth Modal:        z-40 (--fv-z-modal)
```

**Problem**: 
- The auth modal (`z-40`) was at the **same level** as the scoreboard panel (`z-40`)
- The auth modal was **below** the chat panel (`z-50`)
- CSS stacking context caused the modal to render behind both panels

---

## ✅ Solution

**Adjusted z-index hierarchy to ensure modal is always on top:**

### After (Fixed):
```
Scoreboard Panel:  z-30
Chat Panel:        z-30
Auth Modal:        z-40 (--fv-z-modal)
```

**Why this works**:
- Both panels are now at `z-30` (lower priority)
- Auth modal stays at `z-40` (higher priority)
- Modal now renders **above** both panels
- Users can interact with registration form

---

## 📝 Changes Made

### File: `apps/web/components/DirectStreamPageBase.tsx`

**Changed 4 locations:**

1. **Scoreboard collapsed tab** (line ~634):
   ```diff
   - 'fixed left-0 top-1/2 -translate-y-1/2 z-40',
   + 'fixed left-0 top-1/2 -translate-y-1/2 z-30',
   ```

2. **Scoreboard expanded panel** (line ~657):
   ```diff
   - 'fixed left-0 top-1/2 -translate-y-1/2 z-40',
   + 'fixed left-0 top-1/2 -translate-y-1/2 z-30',
   ```

3. **Chat collapsed tab** (line ~936):
   ```diff
   - 'fixed right-0 top-1/2 -translate-y-1/2 z-50',
   + 'fixed right-0 top-1/2 -translate-y-1/2 z-30',
   ```

4. **Chat expanded panel** (line ~970):
   ```diff
   - 'fixed right-0 top-1/2 -translate-y-1/2 z-50',
   + 'fixed right-0 top-1/2 -translate-y-1/2 z-30',
   ```

---

## 🎯 Z-Index Token Reference

From `apps/web/styles/v2/tokens.css`:

```css
--fv-z-base: 0;        /* Base layer */
--fv-z-dropdown: 10;   /* Dropdowns */
--fv-z-sticky: 20;     /* Sticky headers/nav */
--fv-z-overlay: 30;    /* Overlays (NOW: Chat & Scoreboard) */
--fv-z-modal: 40;      /* Modals (Auth, Paywall) */
--fv-z-toast: 50;      /* Toasts */
--fv-z-tooltip: 60;    /* Tooltips */
```

### Proper Hierarchy:
1. **Base UI**: Video player, headers, content (`z-0` to `z-20`)
2. **Panels**: Scoreboard, Chat (`z-30`)
3. **Modals**: Registration, Paywall (`z-40`)
4. **Notifications**: Toasts, Tooltips (`z-50` to `z-60`)

---

## ✅ Testing

### Expected Behavior:
1. ✅ Click "Register to Chat" button
2. ✅ Auth modal slides up from bottom
3. ✅ Modal appears **above** scoreboard and chat panels
4. ✅ User can type in email and name fields
5. ✅ User can click "Register" button
6. ✅ Modal is fully interactive

### Test URLs:
- https://fieldview.live/direct/tchs/soccer-20260113-jv2
- https://fieldview.live/direct/tchs/soccer-20260116-varsity
- https://fieldview.live/direct/dentondiablos/soccer-202601161100-texas-warriors

---

## 📦 Deployment

**Commit**: `a595917`
**Branch**: `main`
**Status**: ✅ Pushed to production (Railway auto-deploy triggered)

---

## 🎉 Impact

**Before**: Users **could not register** for chat when scoreboard/chat panels were open
**After**: Users **can always register**, regardless of panel state

This fix ensures that critical UI elements (authentication) always have proper z-index priority over secondary features (chat/scoreboard panels).

---

## 🔗 Related Issues

- Phase 8.5: v2 component migration
- Cross-stream authentication implementation
- Mobile-first UX improvements

---

## 📚 Future Improvements

Consider:
1. **Automatic z-index management**: Use a z-index utility or context to manage layering
2. **Design system documentation**: Document z-index hierarchy in Storybook
3. **Visual regression tests**: Snapshot tests for modal layering
4. **CSS custom properties**: Use semantic naming for z-index values

