---
id: TC-CN-001
title: Console admin searches purchase by email
priority: high
labels:
  - admin
  - purchases
suite: admin-console
backend-id: "120"
last-synced: "2026-08-05T21:30:30.733Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Support staff can locate a purchase record via global or purchases search without 500 errors.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (site admin)
- Known test purchase email in target env
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open admin console purchases or search surface
2. Enter buyer email (use label / `getByLabel` patterns from Playwright admin specs)
3. Execute search
4. Open detail row navigates to purchase detail route if applicable
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Record found with status, amount, timestamps. Pagination works if many rows.
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
Redact buyer PII in screenshots attached to Traklet/GH issues.
<span style="display:none">{/traklet:section:notes}</span>
