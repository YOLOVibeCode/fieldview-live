---
id: TC-AD-002
title: Producer updates event stream URL after admin unlock
priority: high
labels:
  - admin
  - direct-stream
  - producer
suite: admin
backend-id: "132"
last-synced: "2026-08-05T21:30:45.060Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
After **TC-AD-001**, producer can change playback URL / Mux asset for a nested direct event and player picks up new source (or shows reload prompt).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Unlocked admin panel on `https://dev.fieldview.live/direct/...` event page
- Test-safe HLS or Mux playback URL (may be stub in staging)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open producer admin / stream settings panel
2. Paste new stream URL; save
3. Wait for player to re-bootstrap or manual refresh per UI hint
4. Verify playback attempts new URL (Network → m3u8 host)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Settings persist after page reload; invalid URL shows validation or player error surface, not silent failure.
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
Align with Playwright `direct-stream-event-admin.spec.ts` selectors (`btn-open-admin-panel`, etc.).
<span style="display:none">{/traklet:section:notes}</span>
