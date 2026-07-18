---
id: TC-CN-011
title: Disable an active coupon
priority: high
labels:
  - admin
  - coupons
  - lifecycle
suite: admin-console
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify a superadmin can disable an active coupon via the Disable button, and that the coupon's status badge updates to reflect the disabled state.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one active coupon (create one via TC-CN-009 if needed)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/admin/coupons`
2. Locate an active coupon row (green status badge)
3. Click "Disable" button on that row
4. Verify API call: `DELETE /api/admin/coupons/{couponId}` returns 204
5. Verify the coupon's status badge changes from green "active" to gray "disabled"
6. Verify the "Disable" button is no longer shown for that coupon
7. Verify the coupon remains in the list (soft disable, not removal)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Disable action is a soft delete (sets status to 'disabled')
- Status badge updates in-place without page reload
- Disabled coupons cannot be re-disabled (button hidden)
- Coupon remains visible in the list for audit/reference
- Audit log entry created for `coupon_delete`
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
A disabled coupon should no longer be accepted at checkout. Cross-reference with TC-CW-001 if testing end-to-end coupon flow.
{/traklet:section:notes}
