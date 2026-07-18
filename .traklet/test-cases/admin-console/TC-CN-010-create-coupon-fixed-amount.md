---
id: TC-CN-010
title: Create coupon with fixed amount discount
priority: medium
labels:
  - admin
  - coupons
  - crud
suite: admin-console
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify a superadmin can create a fixed-amount (dollar) coupon, and that the discount type toggle correctly switches between percentage and fixed amount input modes.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/admin/coupons`
2. Click "Create Coupon"
3. Change Discount Type from "Percentage" to "Fixed Amount"
4. Verify the value input label changes to "Amount Off ($)"
5. Verify the input step changes to `0.01` (dollars, not whole numbers)
6. Fill in:
   - Code: `FLAT5`
   - Discount Value: `5.00`
   - Max Uses: leave blank (unlimited)
   - Expires: leave blank (never)
7. Click "Create Coupon"
8. Verify new coupon in table shows:
   - Discount: `$5.00` (not percentage)
   - Used: just a count (no "/ X" for unlimited)
   - Expires: "Never"
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Discount type toggle switches input label, step, and placeholder
- Fixed amount stored correctly in cents on backend
- Table renders dollar amount with `$` prefix
- Unlimited max uses shows just the count, not "X / unlimited"
- "Never" displayed for null expiration
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
Verify the value is correctly converted to cents for API submission (e.g. `5.00` → `500` cents).
{/traklet:section:notes}
