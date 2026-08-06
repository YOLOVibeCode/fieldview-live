---
id: TC-AP-001
title: Viewer account page loads for signed-in user
priority: low
labels:
  - account
  - viewer
suite: account
backend-id: "114"
last-synced: "2026-08-05T21:30:23.510Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
`https://dev.fieldview.live/account` shows purchases, profile, or entitlement summary when a viewer/owner session is present; handles anonymous state per design.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Session with known purchase OR anonymous browser (both if two passes needed)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. While logged in (any relevant viewer identity), open `https://dev.fieldview.live/account`
2. Verify list of accessible games/purchases or empty state
3. Optional: anonymous user hits `https://dev.fieldview.live/account` — redirect to login or marketing message?
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
No 500; PII only for current user; sign-out link works if shown.
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
Low frequency regression; run after auth changes.
<span style="display:none">{/traklet:section:notes}</span>
