# Direct Stream Page Model Architecture

## Overview

All direct stream pages inherit from a single reusable base component: `DirectStreamPageBase`.

This follows DRY (Don't Repeat Yourself) and ISP (Interface Segregation Principle) to ensure maintainable, consistent code across all stream pages.

---

## Architecture

```
DirectStreamPageBase (components/DirectStreamPageBase.tsx)
  ↓
  ├─→ /direct/[slug]/page.tsx (Generic streams)
  ├─→ /direct/tchs/page.tsx (TCHS main)
  └─→ /direct/tchs/[date]/[team]/page.tsx (TCHS team-specific)
```

---

## Base Component Features

### Core Functionality
- ✅ HLS video player with error recovery
- ✅ Admin stream URL management (password-protected)
- ✅ Real-time chat integration (SSE + JWT)
- ✅ Fullscreen mode with keyboard shortcuts
- ✅ Responsive layout (desktop sidebar, mobile stack)
- ✅ Viewer identity management

### Keyboard Shortcuts
- **F** = Toggle fullscreen
- **C** = Toggle chat overlay (when fullscreen)

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
  
  // Components
  ChatOverlayComponent?: React.ComponentType; // Custom chat overlay
  
  // Features
  enableFontSize?: boolean;       // Show font size controls
  fontSizeStorageKey?: string;    // LocalStorage key for font size
  adminPassword?: string;         // Admin password for editing
  
  // Callbacks
  onBootstrapLoaded?: (bootstrap: Bootstrap) => void;
  onStreamStatusChange?: (status: 'loading' | 'playing' | 'offline' | 'error') => void;
}
```

---

## Page Implementations

### 1. Generic Direct Stream (`/direct/[slug]`)

**File**: `apps/web/app/direct/[slug]/page.tsx`

**Configuration**:
- Generic branding
- Default chat overlay (`FullscreenChatOverlay`)
- Admin password: `admin2026`
- No font size controls

**Usage**:
```tsx
const config: DirectStreamPageConfig = {
  bootstrapUrl: `/api/direct/${slug}/bootstrap`,
  updateStreamUrl: `/api/direct/${slug}`,
  title: `${mainTitle} Live Stream`,
  subtitle: displayName,
  sharePath: `fieldview.live/direct/${slug}/`,
  adminPassword: 'admin2026',
};

return <DirectStreamPageBase config={config} />;
```

---

### 2. TCHS Main Stream (`/direct/tchs`)

**File**: `apps/web/app/direct/tchs/page.tsx`

**Configuration**:
- TCHS blue gradient branding
- TCHS-branded chat overlay (`TchsFullscreenChatOverlay`)
- Font size controls enabled
- Admin password from env (`NEXT_PUBLIC_TCHS_ADMIN_PASSWORD`)

**Usage**:
```tsx
const config: DirectStreamPageConfig = {
  bootstrapUrl: `/api/direct/tchs/bootstrap`,
  updateStreamUrl: `/api/direct/tchs`,
  title: 'TCHS Live Stream',
  subtitle: 'Twin Cities High School',
  sharePath: 'fieldview.live/direct/tchs/',
  headerClassName: 'bg-gradient-to-r from-blue-900 to-blue-800',
  ChatOverlayComponent: TchsFullscreenChatOverlay,
  enableFontSize: true,
  fontSizeStorageKey: 'tchs_chat_font_size',
  adminPassword: ADMIN_PASSWORD,
};

return <DirectStreamPageBase config={config} />;
```

---

### 3. TCHS Team-Specific (`/direct/tchs/[date]/[team]`)

**File**: `apps/web/app/direct/tchs/[date]/[team]/page.tsx`

**Configuration**:
- Same as TCHS main, but with dynamic routing
- Date/team-specific bootstrap endpoint
- Custom title formatting

**Usage**:
```tsx
const streamKey = buildTchsStreamKey({ date: params.date, team: params.team });

const config: DirectStreamPageConfig = {
  bootstrapUrl: `/api/tchs/${streamKey}/bootstrap`,
  updateStreamUrl: `/api/tchs/${streamKey}`,
  title: `TCHS ${displayTeamName}`,
  subtitle: `Live Stream • ${params.date}`,
  sharePath: `fieldview.live/direct/tchs/${params.date}/${params.team}`,
  headerClassName: 'bg-gradient-to-r from-blue-900 to-blue-800',
  ChatOverlayComponent: TchsFullscreenChatOverlay,
  enableFontSize: true,
  fontSizeStorageKey: 'tchs_chat_font_size',
  adminPassword: ADMIN_PASSWORD,
};

return <DirectStreamPageBase config={config} />;
```

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

## Adding a New Stream Page

To create a new direct stream page:

1. **Create the page file** (e.g., `apps/web/app/direct/newstream/page.tsx`)

2. **Configure and render**:
```tsx
'use client';

import { DirectStreamPageBase, type DirectStreamPageConfig } from '@/components/DirectStreamPageBase';

export default function NewStreamPage() {
  const config: DirectStreamPageConfig = {
    bootstrapUrl: `/api/direct/newstream/bootstrap`,
    updateStreamUrl: `/api/direct/newstream`,
    title: 'New Stream',
    sharePath: 'fieldview.live/direct/newstream/',
  };

  return <DirectStreamPageBase config={config} />;
}
```

3. **Done!** The page now has:
   - ✅ Video player
   - ✅ Chat integration
   - ✅ Fullscreen mode
   - ✅ Admin editing
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

