# 🗑️ V2 Full Deprecation Plan

**Goal**: Remove ALL legacy template components and use pure v2 design system  
**Scope**: Local testing only (not production yet)  
**Date**: 2026-01-16

---

## 📋 **Legacy Components to Deprecate**

### Currently Used in `DirectStreamPageBase.tsx`:

| Legacy Component | Status | V2 Replacement | Action |
|-----------------|--------|----------------|--------|
| `GameChatPanel` | ❌ In use | v2 `Chat` | Already replaced in chat panel |
| `ViewerUnlockForm` | ❌ In use | v2 `ViewerAuthModal` | Already replaced inline |
| `FullscreenChatOverlay` | ❌ In use | v2 `Chat` + fullscreen detection | **Remove** |
| `FullscreenRegistrationOverlay` | ❌ In use | v2 `ViewerAuthModal` + fullscreen | **Remove** |
| `MobileControlBar` | ❌ In use | v2 responsive behavior | **Remove** |
| `ScoreboardOverlay` | ⚠️ Imported, not used | v2 `Scoreboard` | **Remove import** |
| `CollapsibleScoreboardOverlay` | ❌ In use (fullscreen) | v2 `Scoreboard` | **Remove** |

### Not Used (Safe to Remove):
- `AdminPanel` - ✅ Already v2 inline
- `SocialProducerPanel` - Not rendered
- `ViewerAnalyticsPanel` - Not rendered
- `PaywallModal` - v2 version exists

---

## 🎯 **Migration Strategy**

### Phase 1: Remove Unused Imports ✅
- `AdminPanel` (inline implementation exists)
- `SocialProducerPanel` (not used)
- `ViewerAnalyticsPanel` (not used)
- `PaywallModal` (v2 exists)
- `ScoreboardOverlay` (not used)

### Phase 2: Replace Fullscreen Components
1. **`FullscreenChatOverlay`** → Use v2 `Chat` with fullscreen mode
2. **`FullscreenRegistrationOverlay`** → Use v2 `ViewerAuthModal` with fullscreen detection
3. **`CollapsibleScoreboardOverlay`** → Use v2 `Scoreboard` in fullscreen

### Phase 3: Remove Mobile Control Bar
- **`MobileControlBar`** → v2 components are already responsive
- The v2 `Chat` and `Scoreboard` handle their own mobile behavior
- No separate control bar needed

### Phase 4: Clean Up Legacy Hooks
- Remove `useGameChat` (use `useGameChatV2` only)
- Remove `isTouchDevice`, `isMobileViewport` (use `useResponsive`)

---

## 🔧 **Implementation Steps**

### Step 1: Remove Unused Imports (Easy)
```typescript
// REMOVE THESE:
import { AdminPanel } from '@/components/AdminPanel';
import { SocialProducerPanel } from '@/components/SocialProducerPanel';
import { ScoreboardOverlay } from '@/components/ScoreboardOverlay';
import { ViewerAnalyticsPanel } from '@/components/ViewerAnalyticsPanel';
import { PaywallModal } from '@/components/PaywallModal';
```

### Step 2: Replace Fullscreen Chat
```typescript
// OLD:
{viewer.isUnlocked && bootstrap?.chatEnabled && isFullscreen && (
  <ChatOverlayComponent
    messages={chat.messages}
    onSendMessage={chat.sendMessage}
    // ...
  />
)}

// NEW: v2 Chat already handles fullscreen
// Just ensure it's positioned correctly when fullscreen
```

### Step 3: Replace Fullscreen Registration
```typescript
// OLD:
{!viewer.isUnlocked && bootstrap?.chatEnabled && isFullscreen && (
  <FullscreenRegistrationOverlay
    viewer={viewer}
    isVisible={isChatOverlayVisible}
    // ...
  />
)}

// NEW: Use ViewerAuthModal with fullscreen positioning
{!viewer.isUnlocked && bootstrap?.chatEnabled && isFullscreen && (
  <ViewerAuthModal
    isOpen={isChatOverlayVisible}
    onClose={() => setIsChatOverlayVisible(false)}
    // ... fullscreen styling via className
  />
)}
```

### Step 4: Replace Fullscreen Scoreboard
```typescript
// OLD:
{isFullscreen && bootstrap?.scoreboardEnabled && (
  <CollapsibleScoreboardOverlay
    slug={bootstrap.slug}
    isVisible={isScoreboardOverlayVisible}
    // ...
  />
)}

// NEW: v2 Scoreboard with fullscreen positioning
{isFullscreen && bootstrap?.scoreboardEnabled && (
  <Scoreboard
    homeTeam={scoreboard.homeTeam}
    awayTeam={scoreboard.awayTeam}
    // ... fullscreen mode prop
  />
)}
```

### Step 5: Remove Mobile Control Bar
```typescript
// OLD:
{isTouch && (
  <MobileControlBar
    scoreboardEnabled={bootstrap?.scoreboardEnabled || false}
    // ...
  />
)}

// NEW: Nothing! v2 components are self-sufficient
// The v2 Chat and Scoreboard handle their own mobile interactions
```

---

## ✅ **Testing Checklist**

After each change, verify:
- [ ] Chat works in desktop mode
- [ ] Chat works in mobile mode
- [ ] Chat works in fullscreen
- [ ] Scoreboard works in desktop mode
- [ ] Scoreboard works in mobile mode
- [ ] Scoreboard works in fullscreen
- [ ] Registration flow works
- [ ] Touch interactions work
- [ ] Keyboard shortcuts work (F, C, S)
- [ ] No console errors
- [ ] No hydration errors

---

## 🚀 **Rollout Plan**

1. **Local Testing** (This Phase)
   - Remove all legacy components
   - Test on multiple devices/sizes
   - Ensure feature parity

2. **Branch & PR** (Next)
   - Create `feat/v2-full-migration` branch
   - Open PR with before/after screenshots
   - Get team review

3. **Production Deploy** (After Approval)
   - Merge to main
   - Monitor Railway deployment
   - Watch for any issues

---

## 📊 **Expected Impact**

| Metric | Before | After |
|--------|--------|-------|
| **Component Count** | 15+ legacy | 8 v2 only |
| **Bundle Size** | ~X KB | ~Y KB (smaller) |
| **Code Duplication** | High (v1 + v2) | None |
| **Maintenance** | Two systems | One system |
| **Consistency** | Mixed | Unified v2 |

---

## ⚠️ **Risks & Mitigation**

| Risk | Mitigation |
|------|------------|
| **Feature loss** | Audit all features, ensure v2 parity |
| **Visual regression** | Screenshot testing, manual QA |
| **Performance impact** | Benchmark before/after |
| **User disruption** | Test thoroughly locally first |

---

## 📝 **Notes**

- Keep backup of legacy components (don't delete files yet)
- Document any missing features in v2
- Create issues for any gaps found
- Consider gradual rollout (feature flags)

---

**Ready to proceed?** Let's start with Phase 1 and work through systematically! 🚀

