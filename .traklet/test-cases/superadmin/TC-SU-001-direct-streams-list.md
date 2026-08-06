---
id: TC-SU-001
title: Superadmin direct streams inventory loads
priority: medium
labels:
  - superadmin
  - direct-stream
suite: superadmin
backend-id: "190"
last-synced: "2026-08-05T21:31:52.957Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Users with superadmin role can open direct stream management (`https://dev.fieldview.live/superadmin/direct-streams` or current) and list/search without error.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Superadmin credentials (least privilege test account)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Authenticate as superadmin
2. Navigate to `https://dev.fieldview.live/superadmin/direct-streams`
3. Scroll / search if UI supports it
4. Open one row detail or edit if available (non-destructive)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Table renders; CRUD controls respect RBAC; dangerous actions behind confirmation.
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
Production edits only with change window + owner approval.
<span style="display:none">{/traklet:section:notes}</span>
