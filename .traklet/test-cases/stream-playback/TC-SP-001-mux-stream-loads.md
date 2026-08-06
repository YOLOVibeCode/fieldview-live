---
id: TC-SP-001
title: Mux managed stream loads and plays
priority: critical
labels:
  - stream
  - smoke
  - mux
suite: stream-playback
backend-id: "186"
last-synced: "2026-08-05T21:31:48.274Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that a Mux-managed direct stream loads the MuxStreamPlayer and begins playback.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Active direct stream with `streamProvider: mux_managed` and valid `muxPlaybackId`
- Stream is live or has a recorded asset available
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/direct/[slug]` for a Mux-managed stream
2. Wait for the bootstrap API response
3. Observe the video player area
4. Verify playback begins (live indicator or progress bar advances)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
MuxStreamPlayer renders with the correct `playbackId`. Video plays within 5 seconds. Mux Data metadata is sent (check network tab for `litix.io` requests).
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
MuxStreamPlayer wraps `@mux/mux-player-react` which is built on Media Chrome web components.
<span style="display:none">{/traklet:section:notes}</span>
