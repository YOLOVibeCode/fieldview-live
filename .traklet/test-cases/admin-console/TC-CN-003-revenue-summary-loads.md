---
id: TC-CN-003
title: Admin revenue summary page loads and numbers reconcile at glance
priority: medium
labels:
  - admin
  - revenue
suite: admin-console
backend-id: "121"
last-synced: "2026-08-05T21:30:31.952Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Console revenue report (`https://dev.fieldview.live/admin/revenue` or equivalent) fetches aggregates; spot-check vs single known purchase total when feasible.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session
- Optional fixture purchase amount for mental math
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open Revenue from admin nav
2. Wait for charts/tables; note date filter default
3. Change date range if control exists; ensure reload succeeds
4. If export exists, try CSV (optional)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
No empty error state on prod with real data (unless env empty by design). Totals non-negative and formatted.
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
Financial truth is backend ledger; UI anomalies warrant API comparison.
<span style="display:none">{/traklet:section:notes}</span>
