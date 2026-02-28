# Bookmark Areas – Inventory, Layout & Recommendations

**Scope:** Inventory, layout, and recommendations. Recommendations have been implemented; use the verification checklist to confirm across platforms.

---

## 1. Inventory: Two Bookmark Areas

| # | Area | Collapsible? | What it is | Where it lives |
|---|------|--------------|------------|----------------|
| **1** | **On-screen bookmark controls** | **No** | Timeline markers + action buttons over the video. Always visible when stream is playing and viewer is unlocked. | Inside the video container (same in portrait and landscape). |
| **2** | **Bookmark list panel** | **Yes** | List of bookmarks (My Bookmarks / All Shared) with seek, clip, delete. Shown by opening a panel or switching a tab. | Portrait: tab content. Landscape mobile: bottom sheet. Landscape desktop/tablet: right-edge sidebar. |

---

## 2. Area 1 – On-Screen (Non-Collapsible)

**Components:**
- **BookmarkMarkers** (`BookmarkMarkers.tsx`) – Dots/tabs on the video **timeline** (progress bar). Click jumps to that time. Own = amber, shared = blue.
- **QuickBookmarkButton** – One-click bookmark at current time.
- **BookmarkButton** – Full bookmark (label, notes, sharing, time window).
- **Toggle control** – Button that opens the bookmark list (or in portrait, switches to the Bookmarks tab).

**Layout:**
- **Position:** Bottom-right over the player (`absolute z-20 … bottom-14 right-2` or portrait `bottom-14 right-2`).
- **Visibility:** Only when `streamUrl`, viewer unlocked, `viewerId`, and status not offline/error.
- **Same in all modes:** Portrait, mobile landscape, tablet, desktop. Only spacing/size differs (e.g. mobile `min-h-[44px] min-w-[44px]`).

**Files:**
- `DirectStreamPageBase.tsx` (portrait ~824–855, landscape ~1349–1411)
- `BookmarkMarkers.tsx`, `QuickBookmarkButton`, `BookmarkButton` (usage in DirectStreamPageBase)

---

## 3. Area 2 – Bookmark List Panel (Collapsible)

**Component:** `BookmarkPanel` (`BookmarkPanel.tsx`) – Same component, three render modes:

| Mode | When used | Collapse behavior | UI |
|------|------------|-------------------|-----|
| **inline** | Portrait (as tab content); desktop/tablet (inside right sidebar) | Portrait: switch tab to Chat to “collapse”. Desktop: collapse button → right-edge tab. | Header “Bookmarks” + My Bookmarks / All Shared tabs + `BookmarksList`. |
| **sheet** | Mobile landscape (`isMobile && !isPortrait`) | Bottom sheet; drag or close to collapse. | Same content in `BottomSheet`. |
| **sidebar** | Fallback in `BookmarkPanel` when not inline/sheet | N/A (DirectStreamPageBase uses inline for desktop). | Fixed right sidebar in component. |

**How “collapsed” works by layout:**

| Layout | Collapsed state | Expanded state |
|--------|------------------|----------------|
| **Portrait** | Chat tab selected; bookmark list not visible. | Bookmarks tab selected; bookmark list fills area below tab bar. |
| **Mobile landscape** | Right-side overlay button (bookmark icon). Panel closed. | Bottom sheet opens with bookmark list. |
| **Desktop / tablet** | Right-edge vertical tab (“←” + bookmark icon + optional badge). | Right sidebar (~360px) with header + BookmarkPanel (inline) content. |

**Files:**
- `DirectStreamPageBase.tsx`: portrait `bookmarkContent` → PortraitStreamLayout (~915–933); landscape sidebar (~1466–1552); mobile sheet (~1555–1570).
- `PortraitStreamLayout.tsx`: tab bar (Chat | Bookmarks) and content area.
- `BookmarkPanel.tsx`: inline / sheet / sidebar rendering; `BookmarksList` for list.

---

## 4. Layout Summary (Verify Across Platforms)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PORTRAIT (mobile, orientation portrait)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ VIDEO                                                                 │   │
│  │   • Timeline: BookmarkMarkers (dots on progress bar)  ← AREA 1        │   │
│  │   • Bottom-right: QuickBookmark, Bookmark, [Bookmarks tab btn]       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  [ CompactScoreBar ]                                                        │
│  [ Optional expanded scoreboard ]                                           │
│  ┌───────────────────┬───────────────────┐                                 │
│  │ Chat              │ Bookmarks          │  ← Tab bar                     │
│  └───────────────────┴───────────────────┘                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Tab content: Chat OR Bookmark list (My / All Shared)  ← AREA 2       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LANDSCAPE MOBILE                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ Main content: header, video, footer ]                                     │
│  VIDEO: Area 1 same (markers + buttons bottom-right).                       │
│  Area 2: Overlay button → opens BottomSheet with bookmark list.              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ LANDSCAPE DESKTOP / TABLET (not mobile)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ Header ] [ Scoreboard optional ] [ Video + Area 1 ] [ Chat panel ]         │
│                                                                              │
│  VIDEO: Area 1 same (markers + buttons bottom-right).                         │
│  Right edge: Area 2 = collapsible sidebar OR narrow vertical tab.           │
│               Expanded: fixed right panel (~360px) with BookmarkPanel.       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Recommendations (Implemented)

1. **Single source of “bookmark list”**  
   Area 2 is one component (`BookmarkPanel`) in different modes (inline / sheet / sidebar). Kept as-is; one list implementation reused everywhere.

2. **Avoid duplicate Area 2 in DOM** ✅  
   **Implemented:** In `DirectStreamPageBase`, the mobile bottom-sheet `BookmarkPanel` is now rendered only when `isMobile && !isPortrait`. Portrait uses only the tab content passed to `PortraitStreamLayout`; mobile landscape uses the sheet. No duplicate bookmark list in portrait.

3. **Naming / test IDs** ✅  
   **Implemented:** Area 1 container has `data-testid="bookmark-controls-overlay"` (portrait and landscape). Existing IDs in place: timeline `bookmark-markers`; buttons `btn-quick-bookmark`, `btn-bookmark`, `btn-toggle-bookmark-panel`, `btn-portrait-bookmark-tab`; Area 2 `bookmark-panel-inline`, `bookmark-panel`, `portrait-tab-bookmarks`. Use these for cross-platform checks.

4. **Keyboard shortcut** ✅  
   **Verified:** “B” is handled in one place in `DirectStreamPageBase` (`handleKeyDown`): portrait switches tab; landscape/desktop toggles sidebar/sheet. No change needed.

5. **Verification checklist**  
   - [ ] Portrait: Only one bookmark list visible when Bookmarks tab is selected; no extra panel/sheet.  
   - [ ] Portrait: Area 1 (markers + buttons) visible above the tab bar.  
   - [ ] Mobile landscape: Area 1 visible; opening bookmarks opens bottom sheet only.  
   - [ ] Desktop/tablet: Area 1 visible; collapse/expand only the right sidebar (no sheet).  
   - [ ] All: Bookmark count badges match (tab, sidebar header, overlay button).

---

## 6. File Reference

| Concern | File(s) |
|--------|--------|
| Where Area 1 & 2 are rendered | `apps/web/components/DirectStreamPageBase.tsx` |
| Portrait tab layout | `apps/web/components/v2/layout/PortraitStreamLayout.tsx` |
| Bookmark list UI (all modes) | `apps/web/components/v2/video/BookmarkPanel.tsx` |
| Timeline markers (Area 1) | `apps/web/components/v2/video/BookmarkMarkers.tsx` |
| List content (My / All Shared) | `apps/web/components/dvr/BookmarksList.tsx` |

---

---

## 7. Implementation Summary

| Recommendation | Action |
|----------------|--------|
| 1. Single source of bookmark list | No change; already one `BookmarkPanel` in all modes. |
| 2. Avoid duplicate Area 2 | Sheet `BookmarkPanel` now only when `isMobile && !isPortrait`. Portrait uses tab content only. |
| 3. Naming / test IDs | Added `data-testid="bookmark-controls-overlay"` to Area 1 container (portrait + landscape). Other IDs already present. |
| 4. Keyboard shortcut | Confirmed single handler in `DirectStreamPageBase` for “B”. |
| 5. Verification checklist | Left in doc for manual/E2E verification. |
