---
id: TC-CN-010
title: Create coupon with fixed amount discount
priority: medium
labels:
  - admin
  - coupons
  - crud
suite: admin-console
backend-id: "128"
last-synced: "2026-08-05T21:30:40.279Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify a superadmin can create a fixed-amount (dollar) coupon, and that the discount type toggle correctly switches between percentage and fixed amount input modes.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/admin/coupons`
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
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Discount type toggle switches input label, step, and placeholder
- Fixed amount stored correctly in cents on backend
- Table renders dollar amount with `$` prefix
- Unlimited max uses shows just the count, not "X / unlimited"
- "Never" displayed for null expiration
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
Verify the value is correctly converted to cents for API submission (e.g. `5.00` → `500` cents).
<span style="display:none">{/traklet:section:notes}</span>
