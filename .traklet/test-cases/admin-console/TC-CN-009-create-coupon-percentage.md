---
id: TC-CN-009
title: Create coupon with percentage discount
priority: high
labels:
  - admin
  - coupons
  - crud
suite: admin-console
backend-id: "127"
last-synced: "2026-08-05T21:30:39.167Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify a superadmin can create a new percentage-based coupon via the create modal on the coupons page, with all fields validated and the new coupon appearing in the list.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin — create requires super_admin role)
- No existing coupon with the test code
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/admin/coupons`
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
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Code is auto-uppercased (typing `test20` saves as `TEST20`)
- API call: `POST /api/admin/coupons` returns 201
- Coupon list refreshes with new entry
- Audit log entry created for `coupon_create`
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
Duplicate coupon code should return 409 Conflict with error in modal. Clean up test coupons after run.
<span style="display:none">{/traklet:section:notes}</span>
