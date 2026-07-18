---
id: TC-SP-004
title: Player controls and fullscreen work on primary player
priority: medium
labels:
  - stream
  - playback
  - ux
suite: stream-playback
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Mux or Vidstack player responds to play/pause, volume, and fullscreen without console errors (when stream active).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Stream in playing state (**TC-SP-001** or **TC-SP-002**)
- Desktop browser with fullscreen permission
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Pause and resume playback; audio should mute/unmute per UX
2. Enter fullscreen; exit fullscreen (Esc)
3. If live DVR enabled, scrub slightly; note if disallowed by policy
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Controls responsive; no duplicate HLS instances (see automated `hls-single-instance` tests if flaky).
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
Mobile Safari quirks acceptable if documented in Actual Result.
{/traklet:section:notes}
