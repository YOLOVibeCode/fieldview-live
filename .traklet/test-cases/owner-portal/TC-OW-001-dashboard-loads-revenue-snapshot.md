---
id: TC-OW-001
title: Owner dashboard shows games and revenue snapshot
priority: critical
labels:
  - owner
  - dashboard
suite: owner-portal
backend-id: "164"
last-synced: "2026-08-05T21:31:22.576Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
After owner login, dashboard summarizes games and financial snapshot without blank critical widgets.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-OA-001 complete (authenticated owner with at least zero or more games)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/owners/dashboard`
2. Verify games list or empty state renders
3. Open revenue section if separate; check Network for failed `https://dev.fieldview.live/api` calls
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
No uncaught errors. Numbers match rough expectations for test account (optional cross-check with admin console).
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
Large date-range filters are P2; spot-check default range only for manual pass.
<span style="display:none">{/traklet:section:notes}</span>
