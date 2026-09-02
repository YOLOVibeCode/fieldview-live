---
id: TC-DVR-001
title: Create a DVR bookmark at current playback time
priority: high
labels:
  - dvr
  - bookmark
suite: dvr
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that a viewer can create a bookmark at the current playback position and it appears as a marker on the timeline.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Active stream with DVR/bookmark feature enabled
- Viewer is authenticated (registered or anonymous)
- Video is playing
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open `https://fieldview.live/direct/[slug]` and let playback advance past 30 seconds
2. Click the **Pin** button (`btn-quick-bookmark`) in the top-right corner of the player — this is the one-tap quick bookmark button
3. Observe the timeline for an amber marker appearing immediately (optimistic insert)
4. Press the **B** keyboard shortcut to open the bookmark panel
5. Verify the new bookmark appears in the list with correct timestamp
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Bookmark is created via optimistic insert (appears immediately as an amber marker on the timeline). Bookmark panel (opened via B key) lists the new entry with timestamp and `bufferSeconds` value. The **B** key toggles the panel — it does NOT create a bookmark.
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
`useBookmarkMarkers` hook polls every 30s as fallback; SSE provides real-time shared bookmark updates. Amber = own bookmark, blue = shared bookmark markers. **B** key opens/closes the bookmark panel. Quick bookmark button (top-right of player, `data-testid="btn-quick-bookmark"`) creates a new shared bookmark at current time with one tap.
{/traklet:section:notes}
