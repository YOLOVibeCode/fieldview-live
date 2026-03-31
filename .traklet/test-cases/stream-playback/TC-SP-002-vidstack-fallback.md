---
id: TC-SP-002
title: VidstackPlayer fallback for BYO HLS streams
priority: high
labels:
  - stream
  - vidstack
suite: stream-playback
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that non-Mux streams (BYO HLS) fall back to VidstackPlayer and play correctly.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Direct stream configured with a raw HLS URL (not mux_managed)
- HLS endpoint is accessible
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/direct/<slug>` for a BYO HLS stream
2. Wait for bootstrap API to return `streamProvider` != `mux_managed`
3. Observe the video player
4. Test play/pause, seek, and fullscreen controls
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
VidstackPlayer renders with DefaultVideoLayout. HLS.js loads the manifest. Playback starts. Custom seek buttons (10s forward/back) are visible and functional.
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
VidstackPlayer uses `@vidstack/react` with custom theme CSS mapped to `--fv-color-*` tokens.
{/traklet:section:notes}
