---
id: TC-CW-005
title: Coupon code applied and validated at checkout
priority: high
labels:
  - checkout
  - coupons
  - monetization
suite: checkout
backend-id: "153"
last-synced: "2026-08-05T21:31:09.456Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that a viewer can enter a coupon code on the game checkout page, see it validated with a discount preview, and proceed to payment with the discounted price.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- An active coupon code (create via TC-CN-009)
- A paid game with price > coupon discount
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/game/{gameId}` for a paid game
2. Enter email and phone
3. Enter the coupon code in the coupon input field
4. Click validate/apply — verify `POST /api/public/coupons/validate` is called
5. Verify discount preview shows: original price, discount amount, new total
6. Proceed to payment — verify the checkout is created with discounted amount
7. Test with an invalid coupon code — verify error message (not accepted)
8. Test with an expired or disabled coupon — verify rejection
9. Remove applied coupon — verify price reverts to original
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Valid coupon shows discount preview with updated total
- Invalid/expired coupons show clear error messages
- Checkout amount reflects discounted price
- Coupon can be removed to revert to original price
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
Cross-references TC-CN-009 (create coupon) and TC-CN-011 (disable coupon) for end-to-end coupon lifecycle testing.
<span style="display:none">{/traklet:section:notes}</span>
