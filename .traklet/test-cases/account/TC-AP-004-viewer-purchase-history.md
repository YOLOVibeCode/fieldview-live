---
id: TC-AP-004
title: Viewer views purchase history on account page
priority: high
labels:
  - account
  - viewer
  - purchases
suite: account
backend-id: "117"
last-synced: "2026-08-05T21:30:27.209Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the `https://dev.fieldview.live/account` page shows the viewer's payment history with expandable receipt details.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Authenticated viewer with at least one completed purchase
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/account`
2. Verify Payment History section loads (`GET /api/public/viewer/{id}/purchases`)
3. Verify each purchase shows game/stream name and date
4. Click to expand a purchase receipt
5. Verify expanded details show: amount, payment method, status
6. Collapse the receipt
7. If no purchases: verify empty state message
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Purchase history fetched on page load
- Each purchase is expandable to show receipt details
- Amounts formatted as currency
- Dates formatted as readable locale strings
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
Purchase history is viewer-scoped — only shows purchases for the authenticated viewer.
<span style="display:none">{/traklet:section:notes}</span>
