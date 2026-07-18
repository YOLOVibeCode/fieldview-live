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
1. Start watching a stream and let playback advance past 30 seconds
2. Press the "B" keyboard shortcut or click the bookmark button
3. Observe the timeline for a new marker
4. Open the bookmark panel
5. Verify the new bookmark appears in the list with correct timestamp
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Bookmark is created via optimistic insert (appears immediately). Amber marker appears on the timeline at the correct position. Bookmark panel lists the new entry with timestamp and `bufferSeconds` value.
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
`useBookmarkMarkers` hook polls every 30s. Amber=own, blue=shared markers. Keyboard shortcut "B" triggers bookmark creation.
{/traklet:section:notes}
