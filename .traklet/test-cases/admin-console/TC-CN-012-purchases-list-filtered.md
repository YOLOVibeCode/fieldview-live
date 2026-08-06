---
id: TC-CN-012
title: Admin purchases list with filters and payout breakdown
priority: high
labels:
  - admin
  - purchases
  - analytics
suite: admin-console
backend-id: "130"
last-synced: "2026-08-05T21:30:42.566Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the `https://dev.fieldview.live/admin/purchases` page lists all purchases with date range, status, and org filters, showing payout breakdown (gross, fees, net) and pagination.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated admin)
- At least one purchase in the system
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/admin/purchases`
2. Verify filter card loads with date range, status dropdown, org search input
3. Verify table loads with purchases showing: date, viewer, game, status badge, gross, fees, net
4. Apply status filter "paid" — verify table re-renders with only paid purchases
5. Set a date range — click "Apply Filters" — verify filtered results
6. Enter an org short name — apply — verify filtered by organization
7. Click a purchase row — verify navigation to `https://dev.fieldview.live/admin/purchases/:id` (existing detail page)
8. Test pagination with Previous/Next buttons
9. Verify "Purchases" nav link appears in header alongside Console, Revenue, Coupons
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Purchases load from `GET /api/admin/purchases` with query params
- Payout breakdown shows gross, processor+platform fees, and net amount
- Status badges: created=gray, paid=green, failed=red, refunded=amber
- Click-through to purchase detail works
- Pagination with offset-based navigation
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
Audit log entry created for each purchase list view.
<span style="display:none">{/traklet:section:notes}</span>
