---
id: TC-SP-004
title: Player controls and fullscreen work on primary player
priority: medium
labels:
  - stream
  - playback
  - ux
suite: stream-playback
backend-id: "189"
last-synced: "2026-08-05T21:31:51.769Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Mux or Vidstack player responds to play/pause, volume, and fullscreen without console errors (when stream active).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Stream in playing state (**TC-SP-001** or **TC-SP-002**)
- Desktop browser with fullscreen permission
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Pause and resume playback; audio should mute/unmute per UX
2. Enter fullscreen; exit fullscreen (Esc)
3. If live DVR enabled, scrub slightly; note if disallowed by policy
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Controls responsive; no duplicate HLS instances (see automated `hls-single-instance` tests if flaky).
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
Mobile Safari quirks acceptable if documented in Actual Result.
<span style="display:none">{/traklet:section:notes}</span>
