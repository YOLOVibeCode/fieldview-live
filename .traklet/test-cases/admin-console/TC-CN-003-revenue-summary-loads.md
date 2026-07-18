---
id: TC-CN-003
title: Admin revenue summary page loads and numbers reconcile at glance
priority: medium
labels:
  - admin
  - revenue
suite: admin-console
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Console revenue report (`/admin/revenue` or equivalent) fetches aggregates; spot-check vs single known purchase total when feasible.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session
- Optional fixture purchase amount for mental math
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open Revenue from admin nav
2. Wait for charts/tables; note date filter default
3. Change date range if control exists; ensure reload succeeds
4. If export exists, try CSV (optional)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
No empty error state on prod with real data (unless env empty by design). Totals non-negative and formatted.
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
Financial truth is backend ledger; UI anomalies warrant API comparison.
{/traklet:section:notes}
