---
id: TC-SO-001
title: Stream offline shows intentional UX (not hard error)
priority: high
labels:
  - edge
  - playback
suite: edge-cases
backend-id: "162"
last-synced: "2026-08-05T21:31:20.119Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
When no live Mux/Vidstack source is available, the page communicates “starting soon” / offline per design rather than a stack trace.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Game or direct stream with no active playback ID / idle state in test env
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/direct/[slug]` for an offline/idle stream fixture
2. Read hero/player area messaging
3. Optionally start stream upstream and verify auto-recovery (**TC-SP-001** when live)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Graceful offline UX; telemetry optional; retry behavior documented.
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
Differentiate encoder stop vs Mux asset missing — note which in Actual Result.
<span style="display:none">{/traklet:section:notes}</span>
