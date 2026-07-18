---
id: TC-CW-006
title: Saved payment method one-click repurchase
priority: medium
labels:
  - checkout
  - payments
  - saved-cards
suite: checkout
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that a returning buyer sees their saved payment method on the payment page and can complete a purchase with one click without re-entering card details.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- A viewer who has previously purchased with "save payment" enabled
- A new purchase initiated for the same viewer
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Create a checkout for a viewer who has a saved payment method
2. Navigate to `/checkout/{purchaseId}/payment`
3. Verify saved payment methods load (`GET /api/public/saved-payments?purchaseId=...`)
4. Verify saved card shows last 4 digits and card brand
5. Select the saved card
6. Click "Pay" — verify `POST /api/public/purchases/{id}/process` with saved card sourceId
7. Verify payment processes without entering card details
8. Verify redirect to success page
9. If no saved methods: verify card entry form shows (Apple Pay, Google Pay, manual card)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Saved payment methods fetched and displayed as selectable options
- One-click payment sends saved card token to process endpoint
- Payment completes without re-entering card details
- Fallback to manual card entry if no saved methods exist
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
Requires Square sandbox with saved card fixtures. Payment page uses Square Web Payments SDK.
{/traklet:section:notes}
