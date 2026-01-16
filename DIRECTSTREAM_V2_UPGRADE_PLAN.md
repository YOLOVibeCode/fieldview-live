# 🎨 DirectStreamPageBase v2 Upgrade Plan

**Current Status**: Partially migrated to v2  
**Goal**: Apply full v2 template with all modern UI/UX enhancements

---

## ✅ Already Migrated to v2

1. **Video Components**
   - ✅ `VideoPlayer` (v2)
   - ✅ `VideoControls` (v2)
   - ✅ `VideoContainer` (v2)

2. **Chat**
   - ✅ `Chat` component (v2)
   - ✅ Inline registration (custom implementation)

3. **Scoreboard**
   - ✅ `Scoreboard` component (v2)

4. **Auth**
   - ✅ `ViewerAuthModal` (v2)

---

## 🚧 Missing v2 Features to Apply

### 1. **Layout Components** (High Impact)
- [ ] Replace header with v2 `Header` component
- [ ] Wrap page in v2 `PageShell` for consistent structure
- [ ] Apply v2 responsive breakpoints consistently

### 2. **Primitive Components** (Polish)
- [ ] Replace `Button` with v2 `TouchButton` (44px touch targets)
- [ ] Add v2 `Badge` for notification counts
- [ ] Use v2 `BottomSheet` for mobile modals
- [ ] Apply v2 `Skeleton` for loading states

### 3. **Design Tokens** (Consistency)
- [ ] Apply v2 CSS variables (`--fv-*`)
- [ ] Use v2 spacing scale
- [ ] Apply v2 animation utilities
- [ ] Use v2 z-index system consistently

### 4. **Hooks** (Enhanced Behavior)
- [x] `useFullscreen` (already using v2)
- [ ] `useResponsive` (for breakpoint detection)
- [x] `useCollapsiblePanel` (already using)
- [ ] `usePaywall` (already using)

### 5. **Mobile-First Enhancements**
- [ ] Bottom navigation for mobile (v2 `BottomNav`)
- [ ] Touch-optimized controls
- [ ] Haptic feedback on interactions
- [ ] Safe area support (notch handling)

### 6. **Visual Polish**
- [ ] Translucent panels with backdrop blur
- [ ] Smooth animations (slide, fade, scale)
- [ ] Loading skeletons for async content
- [ ] Badge notifications for chat messages
- [ ] Improved focus states for keyboard navigation

---

## 📋 Implementation Order

### Phase 1: Core Layout (30 min)
1. Import v2 `Header`, `PageShell`
2. Replace current header with v2 `Header`
3. Wrap content in `PageShell`
4. Test responsive behavior

### Phase 2: Primitives (20 min)
1. Replace `Button` → `TouchButton`
2. Add `Badge` for chat message counts
3. Test touch interactions on mobile

### Phase 3: Polish (20 min)
1. Apply v2 design tokens
2. Add loading skeletons
3. Enhance animations
4. Test on multiple devices

---

## 🎯 Expected Improvements

| Feature | Before | After |
|---------|--------|-------|
| **Touch Targets** | Variable sizes | Consistent 44px+ |
| **Animations** | Basic CSS transitions | Smooth, coordinated |
| **Loading States** | Spinner only | Skeleton screens |
| **Mobile UX** | Functional | Polished, native-like |
| **Accessibility** | Good | Excellent (ARIA, focus) |
| **Performance** | Good | Optimized (lazy loading) |

---

## 🧪 Testing Checklist

- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667 - iPhone SE)
- [ ] Mobile (414x896 - iPhone 14)
- [ ] Touch interactions
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

---

**Ready to implement?** Let's start with Phase 1!

