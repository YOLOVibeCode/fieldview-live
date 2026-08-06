---
id: TC-CN-011
title: Disable an active coupon
priority: high
labels:
  - admin
  - coupons
  - lifecycle
suite: admin-console
backend-id: "129"
last-synced: "2026-08-05T21:30:41.429Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify a superadmin can disable an active coupon via the Disable button, and that the coupon's status badge updates to reflect the disabled state.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one active coupon (create one via TC-CN-009 if needed)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/admin/coupons`
2. Locate an active coupon row (green status badge)
3. Click "Disable" button on that row
4. Verify API call: `DELETE /api/admin/coupons/{couponId}` returns 204
5. Verify the coupon's status badge changes from green "active" to gray "disabled"
6. Verify the "Disable" button is no longer shown for that coupon
7. Verify the coupon remains in the list (soft disable, not removal)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Disable action is a soft delete (sets status to 'disabled')
- Status badge updates in-place without page reload
- Disabled coupons cannot be re-disabled (button hidden)
- Coupon remains visible in the list for audit/reference
- Audit log entry created for `coupon_delete`
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
A disabled coupon should no longer be accepted at checkout. Cross-reference with TC-CW-001 if testing end-to-end coupon flow.
<span style="display:none">{/traklet:section:notes}</span>
