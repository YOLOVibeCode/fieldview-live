# Web Implementation (Next.js)

## Overview

Next.js 14+ frontend application with App Router, Server Components, Server Actions, and client-side video playback.

**Location**: `apps/web/`

**Architecture**: Server-first rendering, client-side interactivity, event-driven communication (DataEventBus).

## Project Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── (public)/           # Public routes
│   │   ├── checkout/       # Checkout page
│   │   ├── watch/          # Watch page
│   │   └── layout.tsx
│   ├── (owner)/            # Owner routes
│   │   ├── dashboard/      # Owner dashboard
│   │   ├── games/          # Game management
│   │   └── layout.tsx
│   ├── (admin)/            # Admin routes
│   │   ├── console/        # Admin console
│   │   └── layout.tsx
│   ├── api/                # API routes (Server Actions)
│   │   └── ...
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                # Shadcn/ui components
│   ├── v2/video/          # Video player components (StreamPlayer facade)
│   ├── forms/             # Form components
│   └── shared/            # Shared components
├── lib/                   # Utilities
│   ├── api-client.ts      # Typed API client
│   ├── event-bus.ts       # DataEventBus
│   └── utils.ts
├── hooks/                 # React hooks
│   ├── useAuth.ts
│   ├── useTelemetry.ts
│   └── useVideoPlayer.ts
├── __tests__/
│   ├── unit/              # Component tests
│   └── e2e/               # Playwright E2E tests
├── Dockerfile
├── package.json
└── tsconfig.json
```

## Implementation Phases

### Phase 1: Foundation (Week 3-4)

**Tasks**:
1. Next.js 14+ setup with App Router
2. Tailwind CSS configuration
3. Shadcn/ui component installation
4. TypeScript strict mode
5. API client setup (typed from OpenAPI)
6. DataEventBus setup

**Acceptance Criteria**:
- [ ] Next.js app runs (`pnpm dev`)
- [ ] Tailwind styles apply correctly
- [ ] Shadcn/ui components importable
- [ ] API client types generated from OpenAPI
- [ ] DataEventBus emits/subscribes events
- [ ] 100% test coverage on utilities

### Phase 2: Public Pages - Checkout (Week 4-5)

**Tasks**:
1. Checkout page (`/checkout/[gameId]`)
   - Display game info (teams, start time, price)
   - Form: **email required**, phone optional
   - Submit to Square checkout
   - Handle payment success → redirect to watch link
2. React Hook Form + Zod validation
3. Error handling

**Acceptance Criteria**:
- [ ] Checkout page loads game info
- [ ] Email field required, validated
- [ ] Phone field optional, E.164 format validated
- [ ] Square checkout integration works
- [ ] Success redirects to watch link
- [ ] Error states displayed
- [ ] 100% test coverage

### Phase 3: Public Pages - Watch (Week 5-6)

**Tasks**:
1. Watch page (`/watch/[token]`)
   - Validate entitlement token
   - Bootstrap player (stream URL, config)
   - Create playback session
   - Render video player via the StreamPlayer facade
2. StreamPlayer facade (`components/v2/video/StreamPlayer.tsx`)
   - MuxStreamPlayer (`@mux/mux-player-react`) for Mux-managed streams
   - VidstackPlayer (`@vidstack/react`, hls.js internally) for BYO HLS/RTMP/external
   - Loading states, error states
3. Stream state display (not started/live/ended/unavailable)

**Acceptance Criteria**:
- [ ] Watch page validates token
- [ ] Player loads correct stream (Mux/BYO HLS/external)
- [ ] Session created on play
- [ ] Stream state displayed correctly
- [ ] Error handling (invalid token, stream unavailable)
- [ ] 100% test coverage

### Phase 4: Telemetry Collection (Week 6)

**Tasks**:
1. Telemetry collector hook (`useTelemetry`)
   - Buffer events
   - Error events
   - Startup latency
   - Watch duration
2. Submit telemetry on interval and session end
3. Link telemetry to ViewerIdentity via session

**Acceptance Criteria**:
- [ ] Telemetry events collected (buffer, errors, latency)
- [ ] Telemetry submitted periodically
- [ ] Telemetry submitted on session end
- [ ] Telemetry linked to ViewerIdentity
- [ ] 100% test coverage

### Phase 5: Owner Authentication (Week 6-7)

**Tasks**:
1. Owner login page (`/owner/login`)
2. Owner registration page (`/owner/register`)
3. Square Connect onboarding flow
4. Auth context/hook (`useAuth`)
5. Protected route middleware

**Acceptance Criteria**:
- [ ] Owner can register/login
- [ ] JWT token stored securely
- [ ] Square Connect onboarding completes
- [ ] Protected routes redirect to login
- [ ] 100% test coverage

### Phase 6: Owner Dashboard (FR-8) (Week 7-8)

**Tasks**:
1. Dashboard page (`/owner/dashboard`)
   - Revenue summary
   - Game list (active, upcoming, past)
   - Analytics charts
2. Game management pages (`/owner/games`)
   - Create game form
   - Edit game form
   - StreamSource configuration
   - Keyword/QR display
3. Audience view (`/owner/games/[id]/audience`)
   - Purchasers table (masked emails)
   - Watchers table (session counts)
   - Conversion metrics

**Acceptance Criteria**:
- [ ] Dashboard displays revenue, purchase count, conversion rate
- [ ] Owner can create/edit games
- [ ] StreamSource can be configured (Mux, BYO HLS, BYO RTMP, external)
- [ ] Audience view shows masked emails
- [ ] Tables use stack grid components
- [ ] 100% test coverage

### Phase 7: Admin Console (FR-9) (Week 8)

**Tasks**:
1. Admin login page (`/admin/login`)
   - MFA (TOTP) setup/verification
2. Admin console (`/admin/console`)
   - Global search (email, phone, keyword)
   - Search results table
3. Purchase detail page (`/admin/purchases/[id]`)
   - Purchase timeline
   - Viewer identity (masked for SupportAdmin, full for SuperAdmin)
   - Refund actions
4. Game audience page (`/admin/owners/[ownerId]/games/[gameId]/audience`)
   - Full email visibility for SuperAdmin
   - Masked for SupportAdmin

**Acceptance Criteria**:
- [ ] Admin login requires MFA
- [ ] Global search finds by email/phone/keyword
- [ ] Purchase detail shows timeline
- [ ] Email masking respects role (SuperAdmin sees full)
- [ ] Refund actions work
- [ ] 100% test coverage

## Component Library (Shadcn/ui on Radix UI)

Components are shadcn/ui primitives (Radix UI under the hood) styled with Tailwind. The
generated set lives in `components/ui/` (button, card, form, input, label); additional Radix
packages are used directly (`@radix-ui/react-dialog`, `-dropdown-menu`, `-select`, `-tabs`,
`-label`, `-slot`).

### Required Components

- **Forms**: Input, Textarea, Select, Checkbox, RadioGroup
- **Tables**: Table (with stack grid support)
- **Buttons**: Button, Button variants
- **Dialogs**: Dialog, AlertDialog
- **Navigation**: Tabs, NavigationMenu
- **Feedback**: Toast, Alert
- **Data Display**: Card, Badge, Progress

### Stack Grid Table Component

**Requirement**: Stack grid table components for responsive data tables.

**Implementation**:
- Use Shadcn/ui Table component
- Add responsive breakpoints (stack on mobile, grid on desktop)
- Example: Owner audience table stacks rows on mobile

## Event-Driven Architecture (DataEventBus)

### Usage Pattern

```typescript
// Emit event
import { dataEventBus, DataEvents } from '@/lib/event-bus';

dataEventBus.emit(DataEvents.PURCHASE_CREATED, { purchaseId });

// Subscribe
dataEventBus.subscribe(DataEvents.PURCHASE_CREATED, (data) => {
  // Update UI
});
```

### Events

- `PURCHASE_CREATED`
- `ENTITLEMENT_CREATED`
- `SESSION_STARTED`
- `SESSION_ENDED`
- `REFUND_ISSUED`
- `GAME_STATE_CHANGED`

## Video Player Implementation

Playback is handled by a **StreamPlayer facade** (`components/v2/video/StreamPlayer.tsx`) that
selects the optimal player from provider metadata returned by the bootstrap API
(`streamProvider`, `muxPlaybackId`):

- **Mux-managed streams** (`streamProvider === 'mux_managed'` with a `muxPlaybackId`) → `MuxStreamPlayer`
- **All other streams** (BYO HLS/RTMP, external) → `VidstackPlayer`

### MuxStreamPlayer (Mux-managed)

```typescript
// components/v2/video/MuxStreamPlayer.tsx
import MuxPlayer from '@mux/mux-player-react'; // ^3.10.2

// Wraps @mux/mux-player-react (Media Chrome web component):
// - Automatic signed-URL token refresh
// - Mux Data analytics via the `metadata` prop
// - Stream-type awareness (live / on-demand / DVR) + Go Live button
export function MuxStreamPlayer({ playbackId, playbackToken, metadata }) {
  return <MuxPlayer playbackId={playbackId} tokens={{ playback: playbackToken }} metadata={metadata} />;
}
```

### VidstackPlayer (BYO HLS / RTMP / external)

```typescript
// components/v2/video/VidstackPlayer.tsx
import { MediaPlayer, MediaProvider } from '@vidstack/react'; // ^1.12.13

// Vidstack player with built-in HLS support (powered by hls.js ^1.5.12 internally)
// and DefaultVideoLayout controls. Used for every non-Mux stream.
export function VidstackPlayer({ src }: { src: string }) {
  return (
    <MediaPlayer src={src}>
      <MediaProvider />
    </MediaPlayer>
  );
}
```

## Testing Strategy

### Unit Tests
- Components (React Testing Library)
- Hooks (custom hooks)
- Utilities

### E2E Tests (Playwright)
- Text-to-pay flow
- QR-to-pay flow
- Owner game creation
- Admin search/refund

## Acceptance Criteria (Overall)

- [ ] All public pages work (checkout, watch)
- [ ] Owner dashboard functional
- [ ] Admin console functional
- [ ] Video player works (Mux Player + Vidstack via StreamPlayer facade)
- [ ] Telemetry collection works
- [ ] Email masking works (owner vs SuperAdmin)
- [ ] Event-driven architecture used
- [ ] 100% test coverage
- [ ] Responsive design (mobile + desktop)

## Next Steps

- Proceed to [07-streaming-and-protection.md](./07-streaming-and-protection.md) for streaming details
