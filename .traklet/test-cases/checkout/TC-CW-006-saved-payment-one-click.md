---
id: TC-CW-006
title: Saved payment method one-click repurchase
priority: medium
labels:
  - checkout
  - payments
  - saved-cards
suite: checkout
backend-id: "154"
last-synced: "2026-08-05T21:31:10.631Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that a returning buyer sees their saved payment method on the payment page and can complete a purchase with one click without re-entering card details.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- A viewer who has previously purchased with "save payment" enabled
- A new purchase initiated for the same viewer
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Create a checkout for a viewer who has a saved payment method
2. Navigate to `https://dev.fieldview.live/checkout/{purchaseId}/payment`
3. Verify saved payment methods load (`GET /api/public/saved-payments?purchaseId=...`)
4. Verify saved card shows last 4 digits and card brand
5. Select the saved card
6. Click "Pay" — verify `POST /api/public/purchases/{id}/process` with saved card sourceId
7. Verify payment processes without entering card details
8. Verify redirect to success page
9. If no saved methods: verify card entry form shows (Apple Pay, Google Pay, manual card)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Saved payment methods fetched and displayed as selectable options
- One-click payment sends saved card token to process endpoint
- Payment completes without re-entering card details
- Fallback to manual card entry if no saved methods exist
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
Requires Square sandbox with saved card fixtures. Payment page uses Square Web Payments SDK.
<span style="display:none">{/traklet:section:notes}</span>
