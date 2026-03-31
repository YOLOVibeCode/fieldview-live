---
id: TC-CN-004
title: Admin coupons page lists and allows safe inspection
priority: medium
labels:
  - admin
  - coupons
suite: admin-console
---

{traklet:test-case}

{traklet:section:objective}
## Objective
`/admin/coupons` (or current) loads for authorized admin; creating/editing coupons follows validation (exercise only in non-prod if risky).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 with coupon permissions
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to Coupons
2. If list empty, note empty state UX
3. If create flow exists in env, open form and cancel (or create test coupon per policy)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Page usable; Zod errors on bad inputs; no 500 on list fetch.
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
Pair with checkout if discount codes should alter price display (**TC-CW-001**).
{/traklet:section:notes}
