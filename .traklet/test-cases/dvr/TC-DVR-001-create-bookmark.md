---
id: TC-DVR-001
title: Create a DVR bookmark at current playback time
priority: high
labels:
  - dvr
  - bookmark
suite: dvr
backend-id: "159"
last-synced: "2026-08-05T21:31:16.547Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that a viewer can create a bookmark at the current playback position and it appears as a marker on the timeline.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Active stream with DVR/bookmark feature enabled
- Viewer is authenticated (registered or anonymous)
- Video is playing
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/direct/[slug]` and let playback advance past 30 seconds
2. Press the "B" keyboard shortcut or click the bookmark button
3. Observe the timeline for a new marker
4. Open the bookmark panel
5. Verify the new bookmark appears in the list with correct timestamp
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Bookmark is created via optimistic insert (appears immediately). Amber marker appears on the timeline at the correct position. Bookmark panel lists the new entry with timestamp and `bufferSeconds` value.
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
`useBookmarkMarkers` hook polls every 30s. Amber=own, blue=shared markers. Keyboard shortcut "B" triggers bookmark creation.
<span style="display:none">{/traklet:section:notes}</span>
