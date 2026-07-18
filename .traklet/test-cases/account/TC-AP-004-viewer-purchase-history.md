---
id: TC-AP-004
title: Viewer views purchase history on account page
priority: high
labels:
  - account
  - viewer
  - purchases
suite: account
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the `/account` page shows the viewer's payment history with expandable receipt details.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Authenticated viewer with at least one completed purchase
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/account`
2. Verify Payment History section loads (`GET /api/public/viewer/{id}/purchases`)
3. Verify each purchase shows game/stream name and date
4. Click to expand a purchase receipt
5. Verify expanded details show: amount, payment method, status
6. Collapse the receipt
7. If no purchases: verify empty state message
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Purchase history fetched on page load
- Each purchase is expandable to show receipt details
- Amounts formatted as currency
- Dates formatted as readable locale strings
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
Purchase history is viewer-scoped — only shows purchases for the authenticated viewer.
{/traklet:section:notes}
