---
id: TC-CW-005
title: Coupon code applied and validated at checkout
priority: high
labels:
  - checkout
  - coupons
  - monetization
suite: checkout
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that a viewer can enter a coupon code on the game checkout page, see it validated with a discount preview, and proceed to payment with the discounted price.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- An active coupon code (create via TC-CN-009)
- A paid game with price > coupon discount
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/game/{gameId}` for a paid game
2. Enter email and phone
3. Enter the coupon code in the coupon input field
4. Click validate/apply — verify `POST /api/public/coupons/validate` is called
5. Verify discount preview shows: original price, discount amount, new total
6. Proceed to payment — verify the checkout is created with discounted amount
7. Test with an invalid coupon code — verify error message (not accepted)
8. Test with an expired or disabled coupon — verify rejection
9. Remove applied coupon — verify price reverts to original
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Valid coupon shows discount preview with updated total
- Invalid/expired coupons show clear error messages
- Checkout amount reflects discounted price
- Coupon can be removed to revert to original price
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
Cross-references TC-CN-009 (create coupon) and TC-CN-011 (disable coupon) for end-to-end coupon lifecycle testing.
{/traklet:section:notes}
