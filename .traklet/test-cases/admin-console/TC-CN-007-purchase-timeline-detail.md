---
id: TC-CN-007
title: Purchase timeline detail page loads with events
priority: high
labels:
  - admin
  - purchases
  - timeline
suite: admin-console
backend-id: "125"
last-synced: "2026-08-05T21:30:36.802Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that clicking a purchase from search results navigates to the purchase detail page, which displays purchase info (game, viewer, status, amount) and a chronological timeline of events.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated admin)
- TC-CN-001 completed (purchase found via search)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. From admin console, search for a known purchase (by email or ID)
2. Click a purchase result row (has aria-label "View purchase {id}")
3. Verify navigation to `https://dev.fieldview.live/admin/purchases/{purchaseId}`
4. Verify purchase info card shows:
   - Game title
   - Viewer email (masked for support_admin, full for super_admin)
   - Status
   - Amount in cents
   - Created date/time
5. Verify Timeline card shows chronological events
6. Verify each event shows description (bold), timestamp, and event type
7. Click "Back" button — verify return to `https://dev.fieldview.live/admin/console`
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Purchase detail page loads without error
- Info card displays all purchase metadata correctly
- Timeline events are ordered chronologically
- Back button returns to console (not browser back)
- If no events exist, "No events." message shown
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
Audit log entry is created for `view_purchase` action. Redact PII in screenshots.
<span style="display:none">{/traklet:section:notes}</span>
