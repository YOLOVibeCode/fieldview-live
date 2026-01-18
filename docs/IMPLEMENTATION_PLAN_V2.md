# 📱 FieldView.Live v2 Implementation Plan

## Mobile-First Direct Stream Experience

**Version**: 2.0  
**Created**: January 13, 2026  
**Author**: Software Architect  
**Status**: 📝 **APPROVED FOR IMPLEMENTATION**

---

## 🎯 **Executive Summary**

This document outlines the complete implementation plan for rebuilding the direct stream viewing experience with a **mobile-first, responsive design**. The new architecture will unify disparate components, improve user experience on all devices, and establish a reusable template for future features.

### **Key Objectives**

1. ✅ Mobile-first responsive design (375px primary breakpoint)
2. ✅ Unified components (single scoreboard, single chat)
3. ✅ Touch-optimized interactions (44px+ targets)
4. ✅ Progressive disclosure UI pattern
5. ✅ TDD approach with E2E testing
6. ✅ ISP-compliant architecture

### **Success Metrics**

| Metric | Target | Current |
|--------|--------|---------|
| Mobile Lighthouse Score | >90 | ~65 |
| Time to Interactive | <3s | ~5s |
| Touch Target Compliance | 100% | ~60% |
| Component Reuse | >80% | ~40% |
| Test Coverage | >80% | ~50% |

---

## 📁 **Project Structure**

### **New Directory Layout**

```
apps/web/
├── app/
│   ├── demo-v2/                    # NEW: v2 demo page
│   │   └── page.tsx
│   └── direct-v2/                  # NEW: v2 direct stream
│       └── [slug]/
│           └── [[...event]]/
│               └── page.tsx
│
├── components/
│   └── v2/                         # NEW: v2 components
│       ├── layout/
│       │   ├── Header.tsx
│       │   ├── BottomNav.tsx
│       │   ├── SidePanel.tsx
│       │   └── PageShell.tsx
│       │
│       ├── video/
│       │   ├── VideoPlayer.tsx
│       │   ├── VideoControls.tsx
│       │   └── VideoOverlay.tsx
│       │
│       ├── scoreboard/
│       │   ├── Scoreboard.tsx      # Unified component
│       │   ├── ScoreCard.tsx
│       │   ├── ScoreEditSheet.tsx
│       │   └── GameClock.tsx
│       │
│       ├── chat/
│       │   ├── ChatPanel.tsx       # Unified component
│       │   ├── MessageList.tsx
│       │   ├── MessageInput.tsx
│       │   └── ChatBubble.tsx
│       │
│       ├── auth/
│       │   ├── RegistrationSheet.tsx
│       │   ├── AuthGuard.tsx
│       │   └── ViewerBadge.tsx
│       │
│       └── primitives/
│           ├── BottomSheet.tsx
│           ├── TouchButton.tsx
│           ├── Skeleton.tsx
│           ├── Badge.tsx
│           └── Icon.tsx
│
├── hooks/
│   └── v2/                         # NEW: v2 hooks
│       ├── useResponsive.ts
│       ├── useBottomSheet.ts
│       ├── useGestures.ts
│       ├── useOrientation.ts
│       └── useHaptics.ts
│
├── styles/
│   └── v2/                         # NEW: v2 styles
│       ├── tokens.css              # Design tokens
│       ├── animations.css          # Keyframes
│       └── utilities.css           # Utility classes
│
└── lib/
    └── v2/                         # NEW: v2 utilities
        ├── responsive.ts
        ├── gestures.ts
        └── haptics.ts
```

---

## 🔢 **Phase Breakdown**

### **Phase 0: Setup & Foundation** (Day 1)
*Prerequisites and project scaffolding*

| Task | File | Priority | Est. |
|------|------|----------|------|
| Create v2 directory structure | `/components/v2/` | 🔴 P0 | 30m |
| Set up design tokens CSS | `/styles/v2/tokens.css` | 🔴 P0 | 1h |
| Create `useResponsive` hook | `/hooks/v2/useResponsive.ts` | 🔴 P0 | 2h |
| Create test utilities | `/lib/v2/test-utils.ts` | 🔴 P0 | 1h |
| Set up Storybook (optional) | `/.storybook/` | 🟢 P2 | 2h |

**Deliverables:**
- [ ] Directory structure created
- [ ] Design tokens defined
- [ ] Responsive hook with tests
- [ ] Test utilities ready

---

### **Phase 1: Primitive Components** (Days 2-3)
*Reusable building blocks*

| Task | File | Priority | Est. |
|------|------|----------|------|
| Create `TouchButton` component | `/components/v2/primitives/TouchButton.tsx` | 🔴 P0 | 2h |
| Create `BottomSheet` component | `/components/v2/primitives/BottomSheet.tsx` | 🔴 P0 | 4h |
| Create `Skeleton` component | `/components/v2/primitives/Skeleton.tsx` | 🟡 P1 | 1h |
| Create `Badge` component | `/components/v2/primitives/Badge.tsx` | 🟡 P1 | 1h |
| Create `Icon` component | `/components/v2/primitives/Icon.tsx` | 🟡 P1 | 1h |
| Write unit tests | `/components/v2/primitives/__tests__/` | 🔴 P0 | 2h |

**Component Specifications:**

#### **TouchButton**
```typescript
interface TouchButtonProps {
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';  // 36px, 44px, 52px
  fullWidth?: boolean;
  loading?: boolean;
  haptic?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}
```

#### **BottomSheet**
```typescript
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: number[];      // [0.25, 0.5, 0.9]
  initialSnap?: number;       // Index of initial snap
  enableDrag?: boolean;
  enableBackdrop?: boolean;
  children: React.ReactNode;
}
```

**Deliverables:**
- [ ] TouchButton with 44px+ targets
- [ ] BottomSheet with snap points
- [ ] Skeleton loading states
- [ ] All components tested
- [ ] All components have `data-testid`

---

### **Phase 2: Layout Components** (Days 4-5)
*Page structure and navigation*

| Task | File | Priority | Est. |
|------|------|----------|------|
| Create `Header` component | `/components/v2/layout/Header.tsx` | 🔴 P0 | 2h |
| Create `BottomNav` component | `/components/v2/layout/BottomNav.tsx` | 🔴 P0 | 3h |
| Create `SidePanel` component | `/components/v2/layout/SidePanel.tsx` | 🟡 P1 | 2h |
| Create `PageShell` component | `/components/v2/layout/PageShell.tsx` | 🔴 P0 | 3h |
| Implement responsive switching | `/hooks/v2/useResponsive.ts` | 🔴 P0 | 2h |
| Write integration tests | `/components/v2/layout/__tests__/` | 🔴 P0 | 2h |

**Component Specifications:**

#### **Header**
```typescript
interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onMenu?: () => void;
  rightAction?: React.ReactNode;
  transparent?: boolean;
  sticky?: boolean;
}
```

#### **BottomNav**
```typescript
interface BottomNavProps {
  items: Array<{
    id: string;
    icon: IconName;
    label: string;
    badge?: number;
    active?: boolean;
    onClick: () => void;
  }>;
  safeArea?: boolean;  // Account for home indicator
}
```

#### **PageShell**
```typescript
interface PageShellProps {
  header?: React.ReactNode;
  sidePanel?: React.ReactNode;
  bottomNav?: React.ReactNode;
  children: React.ReactNode;
}
```

**Deliverables:**
- [ ] Header with back/menu actions
- [ ] BottomNav with badge support
- [ ] SidePanel for desktop
- [ ] PageShell orchestrating layout
- [ ] Responsive behavior tested

---

### **Phase 3: Scoreboard v2** (Days 6-8)
*Unified scoreboard component*

| Task | File | Priority | Est. |
|------|------|----------|------|
| Create `Scoreboard` component | `/components/v2/scoreboard/Scoreboard.tsx` | 🔴 P0 | 4h |
| Create `ScoreCard` component | `/components/v2/scoreboard/ScoreCard.tsx` | 🔴 P0 | 3h |
| Create `ScoreEditSheet` component | `/components/v2/scoreboard/ScoreEditSheet.tsx` | 🔴 P0 | 3h |
| Create `GameClock` component | `/components/v2/scoreboard/GameClock.tsx` | 🟡 P1 | 2h |
| Implement score API integration | `/hooks/v2/useScoreboard.ts` | 🔴 P0 | 2h |
| Write unit & integration tests | `/components/v2/scoreboard/__tests__/` | 🔴 P0 | 3h |

**Component Specifications:**

#### **Scoreboard (Unified)**
```typescript
interface ScoreboardProps {
  slug: string;
  
  // Display mode
  mode: 'floating' | 'embedded' | 'sidebar' | 'minimal';
  
  // Positioning (for floating mode)
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  draggable?: boolean;
  
  // Interaction
  canEdit?: boolean;
  viewerToken?: string | null;
  
  // Callbacks
  onScoreChange?: (team: 'home' | 'away', score: number) => void;
}
```

#### **ScoreCard**
```typescript
interface ScoreCardProps {
  team: 'home' | 'away';
  teamName: string;
  teamColor: string;
  score: number;
  canEdit?: boolean;
  onTap?: () => void;
  size?: 'sm' | 'md' | 'lg';
}
```

#### **ScoreEditSheet**
```typescript
interface ScoreEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  team: 'home' | 'away';
  teamName: string;
  currentScore: number;
  onSave: (newScore: number) => Promise<void>;
}
```

**ISP Interfaces:**
```typescript
// Segregated interfaces for scoreboard
interface IScoreboardReader {
  fetchScoreboard(slug: string): Promise<GameScoreboard>;
}

interface IScoreboardWriter {
  updateScore(slug: string, team: 'home' | 'away', score: number): Promise<void>;
}

interface IScoreboardDisplay {
  render(scoreboard: GameScoreboard, mode: ScoreboardMode): React.ReactNode;
}
```

**Deliverables:**
- [ ] Single unified Scoreboard component
- [ ] ScoreCard with tap-to-edit
- [ ] ScoreEditSheet (bottom sheet)
- [ ] GameClock with running/paused states
- [ ] All modes working (floating, embedded, sidebar, minimal)
- [ ] Score API integration
- [ ] 80%+ test coverage

---

### **Phase 4: Chat v2** (Days 9-11)
*Unified chat component*

| Task | File | Priority | Est. |
|------|------|----------|------|
| Create `ChatPanel` component | `/components/v2/chat/ChatPanel.tsx` | 🔴 P0 | 4h |
| Create `MessageList` component | `/components/v2/chat/MessageList.tsx` | 🔴 P0 | 3h |
| Create `MessageInput` component | `/components/v2/chat/MessageInput.tsx` | 🔴 P0 | 2h |
| Create `ChatBubble` component | `/components/v2/chat/ChatBubble.tsx` | 🟡 P1 | 2h |
| Implement virtualization | `/hooks/v2/useVirtualList.ts` | 🟡 P1 | 3h |
| Write unit & integration tests | `/components/v2/chat/__tests__/` | 🔴 P0 | 3h |

**Component Specifications:**

#### **ChatPanel (Unified)**
```typescript
interface ChatPanelProps {
  gameId: string;
  viewerToken: string | null;
  
  // Display mode
  mode: 'panel' | 'sheet' | 'sidebar' | 'overlay';
  
  // State
  isOpen?: boolean;
  onToggle?: () => void;
  
  // Features
  showHeader?: boolean;
  showInput?: boolean;
  maxHeight?: number | string;
  
  // Callbacks
  onUnreadChange?: (count: number) => void;
}
```

#### **MessageList**
```typescript
interface MessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
}
```

#### **MessageInput**
```typescript
interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
}
```

**ISP Interfaces:**
```typescript
// Reuse existing IMessageTransport from v1
interface IChatDisplay {
  renderMessages(messages: ChatMessage[]): React.ReactNode;
  renderInput(props: MessageInputProps): React.ReactNode;
}
```

**Deliverables:**
- [ ] Single unified ChatPanel component
- [ ] Virtualized MessageList (performance)
- [ ] MessageInput with character limit
- [ ] ChatBubble with timestamps
- [ ] Unread count tracking
- [ ] All modes working
- [ ] 80%+ test coverage

---

### **Phase 5: Auth Components** (Days 12-13)
*Registration and authentication*

| Task | File | Priority | Est. |
|------|------|----------|------|
| Create `RegistrationSheet` component | `/components/v2/auth/RegistrationSheet.tsx` | 🔴 P0 | 3h |
| Create `AuthGuard` HOC | `/components/v2/auth/AuthGuard.tsx` | 🔴 P0 | 2h |
| Create `ViewerBadge` component | `/components/v2/auth/ViewerBadge.tsx` | 🟡 P1 | 1h |
| Integrate with existing auth hooks | Integration | 🔴 P0 | 2h |
| Write tests | `/components/v2/auth/__tests__/` | 🔴 P0 | 2h |

**Component Specifications:**

#### **RegistrationSheet**
```typescript
interface RegistrationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (viewer: ViewerIdentity) => void;
  slug: string;
  gameId?: string;
  
  // Customization
  title?: string;
  description?: string;
  showPreview?: boolean;  // Show blurred stream preview
}
```

#### **AuthGuard**
```typescript
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;  // Show when not authenticated
  requireAuth?: boolean;       // If false, just passes isAuthenticated prop
}
```

**Deliverables:**
- [ ] RegistrationSheet (bottom sheet)
- [ ] AuthGuard HOC
- [ ] ViewerBadge (shows user initials)
- [ ] Integration with existing hooks
- [ ] Tests passing

---

### **Phase 6: Video Components** (Days 14-15)
*Video player and controls*

| Task | File | Priority | Est. |
|------|------|----------|------|
| Create `VideoPlayer` component | `/components/v2/video/VideoPlayer.tsx` | 🔴 P0 | 3h |
| Create `VideoControls` component | `/components/v2/video/VideoControls.tsx` | 🔴 P0 | 2h |
| Create `VideoOverlay` component | `/components/v2/video/VideoOverlay.tsx` | 🟡 P1 | 2h |
| Implement fullscreen handling | `/hooks/v2/useFullscreen.ts` | 🔴 P0 | 2h |
| Write tests | `/components/v2/video/__tests__/` | 🔴 P0 | 2h |

**Component Specifications:**

#### **VideoPlayer**
```typescript
interface VideoPlayerProps {
  src: string | null;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  
  // Overlays
  children?: React.ReactNode;  // For scoreboard overlay
  
  // Callbacks
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onError?: (error: Error) => void;
}
```

#### **VideoControls**
```typescript
interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  
  onPlayPause: () => void;
  onMute: () => void;
  onFullscreen: () => void;
  onSeek: (time: number) => void;
  
  autoHide?: boolean;
  autoHideDelay?: number;
}
```

**Deliverables:**
- [ ] VideoPlayer with HLS support
- [ ] VideoControls with auto-hide
- [ ] VideoOverlay for floating elements
- [ ] Fullscreen with orientation lock
- [ ] Tests passing

---

### **Phase 7: Demo Page v2** (Days 16-17)
*Integration and demo page*

| Task | File | Priority | Est. |
|------|------|----------|------|
| Create demo page v2 | `/app/demo-v2/page.tsx` | 🔴 P0 | 4h |
| Integrate all v2 components | Integration | 🔴 P0 | 4h |
| Implement responsive behavior | Integration | 🔴 P0 | 2h |
| Write E2E tests | `/e2e/demo-v2.spec.ts` | 🔴 P0 | 3h |
| Manual device testing | Testing | 🔴 P0 | 3h |

**Page Structure:**
```typescript
// /app/demo-v2/page.tsx
export default function DemoV2Page() {
  return (
    <PageShell
      header={<Header title="Demo v2" />}
      bottomNav={<BottomNav items={navItems} />}
      sidePanel={isMobile ? null : <SidePanel />}
    >
      <VideoPlayer src={streamUrl}>
        <Scoreboard mode="floating" />
      </VideoPlayer>
      
      <ChatPanel mode={isMobile ? 'sheet' : 'sidebar'} />
      
      <RegistrationSheet isOpen={!isAuthenticated} />
    </PageShell>
  );
}
```

**Deliverables:**
- [ ] Demo page v2 fully functional
- [ ] All components integrated
- [ ] Responsive behavior working
- [ ] E2E tests passing
- [ ] Manual testing complete

---

### **Phase 8: Polish & Optimization** (Days 18-19)
*Performance and UX refinement*

| Task | File | Priority | Est. |
|------|------|----------|------|
| Add loading skeletons | All components | 🟡 P1 | 2h |
| Implement haptic feedback | `/lib/v2/haptics.ts` | 🟢 P2 | 2h |
| Optimize bundle size | Build config | 🟡 P1 | 2h |
| Add error boundaries | `/components/v2/ErrorBoundary.tsx` | 🟡 P1 | 2h |
| Performance profiling | DevTools | 🟡 P1 | 2h |
| Accessibility audit | All components | 🔴 P0 | 3h |
| Cross-browser testing | Testing | 🔴 P0 | 3h |

**Deliverables:**
- [ ] All loading states implemented
- [ ] Haptic feedback on iOS/Android
- [ ] Bundle size < 100KB gzip
- [ ] Error boundaries in place
- [ ] Performance targets met
- [ ] WCAG 2.1 AA compliant
- [ ] Works on all target browsers

---

### **Phase 9: Documentation & Handoff** (Day 20)
*Final documentation*

| Task | File | Priority | Est. |
|------|------|----------|------|
| Update component documentation | `/docs/v2/` | 🟡 P1 | 2h |
| Create migration guide v1→v2 | `/docs/MIGRATION_V2.md` | 🟡 P1 | 2h |
| Update README | `/README.md` | 🟡 P1 | 1h |
| Record demo video | External | 🟢 P2 | 1h |
| Team knowledge transfer | Meeting | 🟡 P1 | 2h |

**Deliverables:**
- [ ] Component documentation
- [ ] Migration guide
- [ ] Updated README
- [ ] Demo video (optional)
- [ ] Team briefed

---

## 📊 **Timeline Summary**

```
Week 1: Foundation
├── Day 1:  Phase 0 - Setup
├── Day 2:  Phase 1 - Primitives (start)
├── Day 3:  Phase 1 - Primitives (complete)
├── Day 4:  Phase 2 - Layout (start)
└── Day 5:  Phase 2 - Layout (complete)

Week 2: Core Features
├── Day 6:  Phase 3 - Scoreboard (start)
├── Day 7:  Phase 3 - Scoreboard (cont.)
├── Day 8:  Phase 3 - Scoreboard (complete)
├── Day 9:  Phase 4 - Chat (start)
└── Day 10: Phase 4 - Chat (cont.)

Week 3: Integration
├── Day 11: Phase 4 - Chat (complete)
├── Day 12: Phase 5 - Auth (start)
├── Day 13: Phase 5 - Auth (complete)
├── Day 14: Phase 6 - Video (start)
└── Day 15: Phase 6 - Video (complete)

Week 4: Polish
├── Day 16: Phase 7 - Demo Page (start)
├── Day 17: Phase 7 - Demo Page (complete)
├── Day 18: Phase 8 - Polish (start)
├── Day 19: Phase 8 - Polish (complete)
└── Day 20: Phase 9 - Documentation
```

**Total Duration**: 20 working days (~4 weeks)

---

## ✅ **Acceptance Criteria**

### **Functional Requirements**

- [ ] Registration works on all devices
- [ ] Score editing works on all devices
- [ ] Chat works on all devices
- [ ] Fullscreen works on all devices
- [ ] Real-time updates work (2-4s polling)
- [ ] Persistent viewer identity

### **Non-Functional Requirements**

- [ ] Mobile Lighthouse score > 90
- [ ] Touch targets ≥ 44px
- [ ] Time to Interactive < 3s
- [ ] Bundle size < 100KB gzip
- [ ] Works offline (graceful degradation)
- [ ] WCAG 2.1 AA compliant

### **Testing Requirements**

- [ ] Unit test coverage > 80%
- [ ] Integration tests for all flows
- [ ] E2E tests for critical paths
- [ ] Manual testing on real devices
- [ ] Cross-browser testing complete

---

## 🚀 **Getting Started**

### **Prerequisites**

```bash
# Ensure dependencies are installed
pnpm install

# Verify development environment
pnpm dev

# Run existing tests
pnpm test
```

### **Start Phase 0**

```bash
# Create v2 directory structure
mkdir -p apps/web/components/v2/{layout,video,scoreboard,chat,auth,primitives}
mkdir -p apps/web/hooks/v2
mkdir -p apps/web/styles/v2
mkdir -p apps/web/lib/v2
mkdir -p apps/web/app/demo-v2

# Create initial files
touch apps/web/styles/v2/tokens.css
touch apps/web/hooks/v2/useResponsive.ts
touch apps/web/app/demo-v2/page.tsx
```

### **Development Workflow**

1. **Start with TDD**: Write failing test first
2. **Implement minimum code**: Pass the test
3. **Refactor**: Clean up while green
4. **Add `data-testid`**: All interactive elements
5. **Test on mobile**: Use real device or emulator
6. **Document**: Update component docs

---

## 📝 **Change Log**

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-13 | 1.0 | Initial implementation plan created |

---

## 👥 **Stakeholders**

| Role | Responsibility |
|------|----------------|
| Architect | Design review, technical decisions |
| Engineer | Implementation, testing |
| QA | Testing, bug verification |
| Product | Feature acceptance |

---

## 🔗 **Related Documents**

- [Current Architecture](./ARCHITECTURE.md)
- [API Documentation](./docs/api/)
- [Component Library](./docs/components/)
- [Testing Guide](./docs/testing/)

---

**This implementation plan is now approved and ready for engineering to begin Phase 0.**

**Next Step**: Engineer to create directory structure and begin Phase 0 setup.

