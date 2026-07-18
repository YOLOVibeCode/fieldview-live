# Direct Stream Page Model Architecture

## Overview

All direct stream pages inherit from a single reusable base component: `DirectStreamPageBase`.

This follows DRY (Don't Repeat Yourself) and ISP (Interface Segregation Principle) to ensure maintainable, consistent code across all stream pages.

---

## Architecture

```
DirectStreamPageBase (components/DirectStreamPageBase.tsx)
  ↓
  └─→ /direct/[slug]/[[...event]]/page.tsx (all streams: parent + events)

Parallel thin viewer (does NOT use DirectStreamPageBase):
  /lite/[slug]/[[...event]]/page.tsx → LiteViewer (single <video> + hls.js)
```

All direct streams are served by a single catch-all route. The former
per-stream and TCHS-specific pages (`/direct/[slug]`, `/direct/tchs`,
`/direct/tchs/[date]/[team]`) were removed and folded into
`/direct/[slug]/[[...event]]`.

---

## Base Component Features

### Core Functionality
- ✅ StreamPlayer facade (`components/v2/video/StreamPlayer.tsx`) — routes to MuxStreamPlayer for `mux_managed` streams, VidstackPlayer for generic HLS/BYO streams
- ✅ Admin stream URL management
- ✅ Real-time chat integration (SSE + JWT)
- ✅ Fullscreen mode with keyboard shortcuts
- ✅ Responsive layout (desktop sidebar, mobile stack, portrait tabs)
- ✅ Viewer identity management (registered + anonymous)
- ✅ Paywall enforcement, scoreboard, and bookmarks (DVR)

### Keyboard Shortcuts
Handled by `DirectStreamPageBase`:
- **C** = Toggle chat
- **S** = Toggle scoreboard
- **B** = Toggle bookmarks
- **Escape** = Close open panels

Handled by the underlying Vidstack player: **F** (fullscreen), **Space** (play/pause), **M** (mute), **arrows** (seek).

### Layout
- **Desktop**: Video (left) + Chat sidebar (right)
- **Mobile**: Stacked (video top, chat bottom)
- **Fullscreen**: Translucent chat overlay

---

## Configuration Props

```typescript
interface DirectStreamPageConfig {
  // Data fetching
  bootstrapUrl: string;           // API endpoint for bootstrap data
  updateStreamUrl: string;        // API endpoint for updating stream URL
  
  // Display
  title: string;                  // Main page title
  subtitle?: string;              // Optional subtitle
  sharePath: string;              // Share link text
  
  // Branding
  headerClassName?: string;       // Custom header styling
  containerClassName?: string;    // Custom container styling
  
  // Features
  enableFontSize?: boolean;       // Show font size controls
  fontSizeStorageKey?: string;    // LocalStorage key for font size
  
  // Callbacks
  onBootstrapLoaded?: (bootstrap: Bootstrap) => void;
  onStreamStatusChange?: (status: 'loading' | 'playing' | 'offline' | 'incoming' | 'error') => void;
}
```

---

## Page Implementations

Every slug is served by one catch-all route — there are no per-stream page files. The route reconstructs the full slug from the URL segments, enforces lowercase URLs (redirect) and a single level of nesting (deeper paths 404), then delegates to `DirectStreamPageBase`. Branding/paywall/scoreboard/etc. come from the stream's bootstrap data, not from hard-coded page config.

### Unified Direct Stream Route (`/direct/[slug]/[[...event]]`)

**File**: `apps/web/app/direct/[slug]/[[...event]]/page.tsx`

**Case 1 — Parent stream** (no event segment, e.g. `/direct/stormfc`):
```tsx
const config: DirectStreamPageConfig = {
  bootstrapUrl: `/api/direct/${encodeURIComponent(fullSlug)}/bootstrap`,
  updateStreamUrl: `/api/direct/${encodeURIComponent(fullSlug)}`,
  title: `${mainTitle} Live Stream`,
  subtitle: displayName,
  sharePath: `fieldview.live/direct/${slug}/`,
};

return <DirectStreamPageBase config={config} />;
```

**Case 2 — Event / composite slug** (one segment, e.g. `/direct/tchs/soccer-20260120-jv2`):
```tsx
const config: DirectStreamPageConfig = {
  bootstrapUrl: `/api/direct/${encodeURIComponent(fullSlug)}/bootstrap`,
  updateStreamUrl: `/api/direct/${encodeURIComponent(fullSlug)}`,
  title: displayName,
  subtitle: displayName,
  sharePath: `fieldview.live/direct/${slug}/${eventSlug}`,
};

return <DirectStreamPageBase config={config} />;
```

> The former TCHS-specific routes (`/direct/tchs`, `/direct/tchs/[date]/[team]`) and their custom chat overlays / admin passwords were removed (commit `6d3e9e0`, "remove stale TCHS-specific code") and folded into this catch-all route.

---

### Lite Viewer Route (`/lite/[slug]/[[...event]]`)

**File**: `apps/web/app/lite/[slug]/[[...event]]/page.tsx`

A parallel proof-of-concept route that reuses the identical bootstrap-URL builder but renders the thin `LiteViewer` (single `<video>` + hls.js, wrapper-owned fullscreen) instead of `DirectStreamPageBase`. The `/direct` route is untouched by it.

---

## Benefits

### 1. **DRY (Don't Repeat Yourself)**
- Single source of truth for all stream pages
- Bug fixes apply to all pages automatically
- Consistent behavior across the application

### 2. **ISP (Interface Segregation)**
- Pages configure only what they need
- Optional features (font size, custom branding)
- Focused, minimal configuration per page

### 3. **Maintainability**
- 600+ lines of code → 40 lines per page
- Clear separation of concerns
- Easy to add new stream pages

### 4. **Consistency**
- All pages have identical UX
- Keyboard shortcuts work everywhere
- Chat behavior is uniform

---

## Adding a New Stream

Because every slug is served by the catch-all `/direct/[slug]/[[...event]]` route, adding a stream no longer requires creating a page file. Provision the stream (its slug + configuration: branding, paywall, scoreboard, chat, etc.) and visiting `/direct/<slug>` renders it through `DirectStreamPageBase` automatically, with:
   - ✅ Video player (StreamPlayer: Mux or Vidstack)
   - ✅ Chat integration (registered + anonymous)
   - ✅ Fullscreen mode
   - ✅ Scoreboard, bookmarks (DVR), paywall enforcement
   - ✅ Keyboard shortcuts

---

## Code Metrics

### Before Refactoring
- `/direct/[slug]/page.tsx`: **425 lines**
- `/direct/tchs/page.tsx`: **415 lines**
- `/direct/tchs/[date]/[team]/page.tsx`: **474 lines**
- **Total**: **1,314 lines** (with duplication)

### After Refactoring
- `DirectStreamPageBase.tsx`: **570 lines** (reusable)
- `/direct/[slug]/page.tsx`: **40 lines**
- `/direct/tchs/page.tsx`: **43 lines**
- `/direct/tchs/[date]/[team]/page.tsx`: **55 lines**
- **Total**: **708 lines** (46% reduction)

**Maintainability**: 🚀 **Massive improvement**

---

## Testing

All pages maintain 100% feature parity:
- ✅ Type-checked (TypeScript strict mode)
- ✅ Chat functionality works
- ✅ Fullscreen + keyboard shortcuts
- ✅ Admin editing
- ✅ Responsive layout

---

## Future Enhancements

Easy to add at the base level:
- Analytics tracking
- Error reporting (Sentry)
- Performance monitoring
- A/B testing
- Custom themes
- Accessibility improvements

All changes cascade to all pages automatically! 🎉

