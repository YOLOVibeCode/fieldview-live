---
id: TC-AA-002
title: Site admin console primary navigation works
priority: high
labels:
  - admin
  - console
suite: auth-admin
backend-id: "134"
last-synced: "2026-08-05T21:30:47.436Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
From an authenticated console session, core screens load without 500s (purchases, revenue, coupons as deployed).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Completed TC-AA-001 (or existing admin session)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open admin console landing
2. Navigate to each primary sidebar/area your role can access (e.g. purchases, revenue, coupons, direct streams if enabled)
3. Watch for error banners, blank data grids, or failed API calls in Network tab
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Each page renders a coherent shell and fetches data (empty state acceptable). No uncaught errors blocking the layout.
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
Scope follows RBAC: note if a link is hidden vs denied with 403.
<span style="display:none">{/traklet:section:notes}</span>
