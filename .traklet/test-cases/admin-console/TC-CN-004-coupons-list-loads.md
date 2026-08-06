---
id: TC-CN-004
title: Admin coupons page lists and allows safe inspection
priority: medium
labels:
  - admin
  - coupons
suite: admin-console
backend-id: "122"
last-synced: "2026-08-05T21:30:33.161Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
`https://dev.fieldview.live/admin/coupons` (or current) loads for authorized admin; creating/editing coupons follows validation (exercise only in non-prod if risky).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 with coupon permissions
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to Coupons
2. If list empty, note empty state UX
3. If create flow exists in env, open form and cancel (or create test coupon per policy)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Page usable; Zod errors on bad inputs; no 500 on list fetch.
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
Pair with checkout if discount codes should alter price display (**TC-CW-001**).
<span style="display:none">{/traklet:section:notes}</span>
