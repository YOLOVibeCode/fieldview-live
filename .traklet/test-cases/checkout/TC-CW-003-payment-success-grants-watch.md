---
id: TC-CW-003
title: Successful payment shows watch experience with player
priority: critical
labels:
  - checkout
  - e2e
  - monetization
suite: checkout
---

{traklet:test-case}

{traklet:section:objective}
## Objective
End-to-end: after successful Square payment (or test webhook path), viewer can watch — aligns revenue path with **TC-PW-002** but includes payment provider completion.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Ability to complete sandbox payment OR use pre-seeded success return URL in test env
- Known purchase/game that maps to playback
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Run checkout through TC-CW-002 until payment succeeds
2. Land on success or return URL (`/checkout/.../success` pattern if used)
3. Navigate to watch/game page as instructed
4. Confirm player area visible; HLS or Mux playback starts (may take a few seconds)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Access granted; paywall not shown for same session/token; video or “live” state matches stream status.
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
If automation owns this path, manual Traklet run can be quarterly with finance witness.
{/traklet:section:notes}
