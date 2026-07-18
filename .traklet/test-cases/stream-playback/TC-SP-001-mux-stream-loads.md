---
id: TC-SP-001
title: Mux managed stream loads and plays
priority: critical
labels:
  - stream
  - smoke
  - mux
suite: stream-playback
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that a Mux-managed direct stream loads the MuxStreamPlayer and begins playback.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Active direct stream with `streamProvider: mux_managed` and valid `muxPlaybackId`
- Stream is live or has a recorded asset available
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/direct/<slug>` for a Mux-managed stream
2. Wait for the bootstrap API response
3. Observe the video player area
4. Verify playback begins (live indicator or progress bar advances)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
MuxStreamPlayer renders with the correct `playbackId`. Video plays within 5 seconds. Mux Data metadata is sent (check network tab for `litix.io` requests).
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
MuxStreamPlayer wraps `@mux/mux-player-react` which is built on Media Chrome web components.
{/traklet:section:notes}
