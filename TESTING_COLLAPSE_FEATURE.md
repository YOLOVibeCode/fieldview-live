# Testing Collapse-to-Edge Feature Locally

## ✅ Implementation Complete

The collapse-to-edge functionality has been implemented for both scoreboard and chat:

### Features Implemented:
1. ✅ `useCollapsiblePanel` hook for state management
2. ✅ Scoreboard collapses to left edge (50px tab)
3. ✅ Chat collapses to right edge (50px tab)
4. ✅ Keyboard shortcuts: `S` (scoreboard), `C` (chat)
5. ✅ localStorage persistence
6. ✅ Slide animations (300ms)
7. ✅ Visual feedback (hover effects)

## 🧪 Testing Checklist

### Prerequisites:
1. **API Server Running**: `pnpm --filter api dev` (port 4301)
2. **Web Server Running**: `pnpm --filter web dev` (port 4300)
3. **Database**: Scoreboard must be enabled for the stream

### Test Steps:

#### 1. Enable Scoreboard (if not already enabled)
```
1. Navigate to: http://localhost:4300/direct/tchs/soccer-20260109-varsity
2. Click "Edit Stream"
3. Authenticate with admin password
4. Enable "Enable Scoreboard" checkbox
5. Set team names and colors
6. Save changes
```

#### 2. Test Scoreboard Collapse (Left Edge)
```
1. Navigate to: http://localhost:4300/direct/tchs/soccer-20260109-varsity
2. Verify scoreboard is visible (expanded state)
3. Click the "←" collapse button on scoreboard
   OR press 'S' key
4. Verify scoreboard collapses to left-edge tab
5. Verify tab shows:
   - ← arrow
   - 📊 icon
   - Score badge (e.g., "0-0")
   - Clock (if running)
6. Click the collapsed tab
   OR press 'S' key again
7. Verify scoreboard expands back
```

#### 3. Test Chat Collapse (Right Edge)
```
1. Navigate to: http://localhost:4300/direct/tchs/soccer-20260109-varsity
2. Verify chat is visible (if enabled and unlocked)
3. Click the "→" collapse button on chat header
   OR press 'C' key
4. Verify chat collapses to right-edge tab
5. Verify tab shows:
   - → arrow
   - 💬 icon
   - Message count badge
6. Click the collapsed tab
   OR press 'C' key again
7. Verify chat expands back
```

#### 4. Test Both Collapsed
```
1. Collapse both scoreboard and chat
2. Verify both tabs visible on edges
3. Verify video has full width
4. Expand one, verify other stays collapsed
5. Expand both, verify both visible
```

#### 5. Test localStorage Persistence
```
1. Collapse scoreboard
2. Refresh page
3. Verify scoreboard stays collapsed
4. Expand scoreboard
5. Refresh page
6. Verify scoreboard stays expanded
```

#### 6. Test Keyboard Shortcuts
```
1. Press 'S' → Scoreboard toggles
2. Press 'C' → Chat toggles
3. Press 'F' → Fullscreen (should use fullscreen overlays)
4. In fullscreen, press 'S' → Fullscreen scoreboard toggles
5. In fullscreen, press 'C' → Fullscreen chat toggles
```

## 🐛 Known Issues to Check

1. **Scoreboard not showing**: 
   - Check if `scoreboardEnabled` is true in bootstrap
   - Check API: `curl http://localhost:4301/api/public/direct/tchs/events/soccer-20260109-varsity/bootstrap`
   - Verify scoreboard exists in database

2. **Collapse not working**:
   - Check browser console for errors
   - Verify `useCollapsiblePanel` hook is working
   - Check localStorage: `localStorage.getItem('scoreboard-collapsed-tchs')`

3. **Keyboard shortcuts not working**:
   - Verify not typing in input field
   - Check dependency array includes `scoreboardPanel.toggle` and `chatPanel.toggle`
   - Check if event handler is attached

## 📝 Expected Behavior

### Scoreboard (Left Edge)
- **Expanded**: Traditional overlay at top-left (or configured position)
- **Collapsed**: 50px tab on left edge, vertically centered
- **Tab shows**: ← arrow, 📊 icon, score badge, clock (if running)

### Chat (Right Edge)
- **Expanded**: Panel on right side
- **Collapsed**: 50px tab on right edge, vertically centered
- **Tab shows**: → arrow, 💬 icon, message count badge

### Animations
- **Collapse**: Smooth slide animation (300ms ease-in-out)
- **Hover**: Tab expands slightly on hover (w-12 → w-14)

## 🔍 Debug Commands

```bash
# Check if API is running
curl http://localhost:4301/api/public/direct/tchs/events/soccer-20260109-varsity/bootstrap

# Check scoreboard API
curl http://localhost:4301/api/direct/tchs/scoreboard

# Check localStorage in browser console
localStorage.getItem('scoreboard-collapsed-tchs')
localStorage.getItem('chat-collapsed')
```

## ✅ Success Criteria

- [ ] Scoreboard collapses to left edge when clicking collapse button
- [ ] Scoreboard collapses when pressing 'S' key
- [ ] Chat collapses to right edge when clicking collapse button
- [ ] Chat collapses when pressing 'C' key
- [ ] Collapsed tabs show correct badges/icons
- [ ] Position persists across page refreshes
- [ ] Animations are smooth
- [ ] Works in both fullscreen and non-fullscreen modes
- [ ] No console errors
- [ ] No TypeScript errors

---

**ROLE: engineer STRICT=false**

