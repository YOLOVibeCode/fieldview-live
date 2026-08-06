---
id: TC-OW-005
title: Coach console entry loads for eligible owner
priority: medium
labels:
  - owner
  - coach
suite: owner-portal
backend-id: "168"
last-synced: "2026-08-05T21:31:27.379Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
`https://dev.fieldview.live/owners/coach` (or linked coach experience) opens for accounts with coach features—watch links, sideline tools, or audience widgets as deployed.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Owner login with coach feature flag or role
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. From `https://dev.fieldview.live/owners/dashboard`, navigate to Coach (`https://dev.fieldview.live/owners/coach`)
2. Verify primary panels render
3. Smoke one non-destructive action (e.g. view watch link list)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
No auth loop; features match entitlement (hide vs disable for others).
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
Update route names in Notes when product nav changes.
<span style="display:none">{/traklet:section:notes}</span>
