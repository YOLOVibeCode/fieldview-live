---
id: TC-DVR-002
title: Shared bookmarks visible to other viewers
priority: medium
labels:
  - dvr
  - bookmark
  - sharing
suite: dvr
backend-id: "160"
last-synced: "2026-08-05T21:31:17.703Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that bookmarks shared by one viewer appear as blue markers on another viewer's timeline.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Two authenticated viewers on the same stream (e.g. `https://dev.fieldview.live/direct/[slug]`)
- DVR/bookmark feature enabled
- Viewer A has created and shared a bookmark
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Viewer A creates a bookmark and marks it as shared
2. Wait up to 30 seconds (polling interval) or manually refresh
3. Observe Viewer B's timeline
4. Verify blue marker appears at the correct position
5. Hover over the blue marker to see the tooltip
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Blue marker appears on Viewer B's timeline at the shared bookmark position. BookmarkTooltip shows the bookmark details on hover. `listByStreamWithShared()` returns both own + shared bookmarks.
<span style="display:none">{/traklet:section:expected-result}</span>

<span style="display:none">{traklet:section:actual-result}</span>
## Actual Result
_Not yet tested._
<span style="display:none">{/traklet:section:actual-result}</span>

<span style="display:none">{traklet:section:evidence}</span>
## Evidence
_No recordings or screenshots attached yet._

> **Tip:** Use [Jam.dev](https://jam.dev) to record your testing session, then paste the link here.
<span style="display:none">{/traklet:section:evidence}</span>

<span style="display:none">{traklet:section:diagnostics}</span>
## Diagnostics
_Diagnostics will be auto-attached when submitting results._
<span style="display:none">{/traklet:section:diagnostics}</span>

<span style="display:none">{traklet:section:notes}</span>
## Notes
CSS-only tooltip (no Radix inside player). BookmarkTooltip component. 30s polling interval via `useBookmarkMarkers`.
<span style="display:none">{/traklet:section:notes}</span>
