---
id: TC-CW-003
title: Successful payment shows watch experience with player
priority: critical
labels:
  - checkout
  - e2e
  - monetization
suite: checkout
backend-id: "151"
last-synced: "2026-08-05T21:31:07.187Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
End-to-end: after successful Square payment (or test webhook path), viewer can watch — aligns revenue path with **TC-PW-002** but includes payment provider completion.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Ability to complete sandbox payment OR use pre-seeded success return URL in test env
- Known purchase/game that maps to playback
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Run checkout through TC-CW-002 until payment succeeds
2. Land on success or return URL (`https://dev.fieldview.live/checkout/.../success` pattern if used)
3. Navigate to watch/game page as instructed
4. Confirm player area visible; HLS or Mux playback starts (may take a few seconds)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Access granted; paywall not shown for same session/token; video or “live” state matches stream status.
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
If automation owns this path, manual Traklet run can be quarterly with finance witness.
<span style="display:none">{/traklet:section:notes}</span>
