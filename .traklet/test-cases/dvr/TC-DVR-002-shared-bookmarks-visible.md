---
id: TC-DVR-002
title: Shared bookmarks visible to other viewers
priority: medium
labels:
  - dvr
  - bookmark
  - sharing
suite: dvr
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that bookmarks shared by one viewer appear as blue markers on another viewer's timeline.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Two authenticated viewers on the same stream
- DVR/bookmark feature enabled
- Viewer A has created and shared a bookmark
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Viewer A creates a bookmark and marks it as shared
2. Wait up to 30 seconds (polling interval) or manually refresh
3. Observe Viewer B's timeline
4. Verify blue marker appears at the correct position
5. Hover over the blue marker to see the tooltip
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Blue marker appears on Viewer B's timeline at the shared bookmark position. BookmarkTooltip shows the bookmark details on hover. `listByStreamWithShared()` returns both own + shared bookmarks.
{/traklet:section:expected-result}

{traklet:section:actual-result}
## Actual Result
_Not yet tested._
{/traklet:section:actual-result}

{traklet:section:evidence}
## Evidence
{/traklet:section:evidence}

{traklet:section:notes}
## Notes
CSS-only tooltip (no Radix inside player). BookmarkTooltip component. 30s polling interval via `useBookmarkMarkers`.
{/traklet:section:notes}
