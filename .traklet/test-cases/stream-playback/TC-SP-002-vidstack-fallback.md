---
id: TC-SP-002
title: VidstackPlayer fallback for BYO HLS streams
priority: high
labels:
  - stream
  - vidstack
suite: stream-playback
backend-id: "187"
last-synced: "2026-08-05T21:31:49.466Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that non-Mux streams (BYO HLS) fall back to VidstackPlayer and play correctly.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Direct stream configured with a raw HLS URL (not mux_managed)
- HLS endpoint is accessible
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/direct/[slug]` for a BYO HLS stream
2. Wait for bootstrap API to return `streamProvider` != `mux_managed`
3. Observe the video player
4. Test play/pause, seek, and fullscreen controls
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
VidstackPlayer renders with DefaultVideoLayout. HLS.js loads the manifest. Playback starts. Custom seek buttons (10s forward/back) are visible and functional.
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
VidstackPlayer uses `@vidstack/react` with custom theme CSS mapped to `--fv-color-*` tokens.
<span style="display:none">{/traklet:section:notes}</span>
