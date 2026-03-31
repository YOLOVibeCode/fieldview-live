---
id: TC-CN-007
title: Purchase timeline detail page loads with events
priority: high
labels:
  - admin
  - purchases
  - timeline
suite: admin-console
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that clicking a purchase from search results navigates to the purchase detail page, which displays purchase info (game, viewer, status, amount) and a chronological timeline of events.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated admin)
- TC-CN-001 completed (purchase found via search)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. From admin console, search for a known purchase (by email or ID)
2. Click a purchase result row (has aria-label "View purchase {id}")
3. Verify navigation to `/admin/purchases/{purchaseId}`
4. Verify purchase info card shows:
   - Game title
   - Viewer email (masked for support_admin, full for super_admin)
   - Status
   - Amount in cents
   - Created date/time
5. Verify Timeline card shows chronological events
6. Verify each event shows description (bold), timestamp, and event type
7. Click "Back" button — verify return to `/admin/console`
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Purchase detail page loads without error
- Info card displays all purchase metadata correctly
- Timeline events are ordered chronologically
- Back button returns to console (not browser back)
- If no events exist, "No events." message shown
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
Audit log entry is created for `view_purchase` action. Redact PII in screenshots.
{/traklet:section:notes}
