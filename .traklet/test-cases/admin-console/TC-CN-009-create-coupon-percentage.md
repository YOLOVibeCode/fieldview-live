---
id: TC-CN-009
title: Create coupon with percentage discount
priority: high
labels:
  - admin
  - coupons
  - crud
suite: admin-console
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify a superadmin can create a new percentage-based coupon via the create modal on the coupons page, with all fields validated and the new coupon appearing in the list.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin — create requires super_admin role)
- No existing coupon with the test code
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/admin/coupons`
2. Click "Create Coupon" button
3. Verify create modal appears
4. Fill in fields:
   - Coupon Code: e.g. `TEST20` (auto-uppercased)
   - Discount Type: "Percentage" (default)
   - Discount Value: `20`
   - Max Uses: `100` (optional)
   - Expires: a future date (optional)
5. Click "Create Coupon" submit button
6. Verify modal closes
7. Verify new coupon appears in the table with:
   - Code: `TEST20` (monospace, bold)
   - Discount: `20%`
   - Used: `0 / 100`
   - Expiration date
   - Status badge: green "active"
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Code is auto-uppercased (typing `test20` saves as `TEST20`)
- API call: `POST /api/admin/coupons` returns 201
- Coupon list refreshes with new entry
- Audit log entry created for `coupon_create`
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
Duplicate coupon code should return 409 Conflict with error in modal. Clean up test coupons after run.
{/traklet:section:notes}
