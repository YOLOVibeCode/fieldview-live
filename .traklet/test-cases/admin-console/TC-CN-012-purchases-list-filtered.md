---
id: TC-CN-012
title: Admin purchases list with filters and payout breakdown
priority: high
labels:
  - admin
  - purchases
  - analytics
suite: admin-console
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the `/admin/purchases` page lists all purchases with date range, status, and org filters, showing payout breakdown (gross, fees, net) and pagination.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated admin)
- At least one purchase in the system
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/admin/purchases`
2. Verify filter card loads with date range, status dropdown, org search input
3. Verify table loads with purchases showing: date, viewer, game, status badge, gross, fees, net
4. Apply status filter "paid" — verify table re-renders with only paid purchases
5. Set a date range — click "Apply Filters" — verify filtered results
6. Enter an org short name — apply — verify filtered by organization
7. Click a purchase row — verify navigation to `/admin/purchases/:id` (existing detail page)
8. Test pagination with Previous/Next buttons
9. Verify "Purchases" nav link appears in header alongside Console, Revenue, Coupons
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Purchases load from `GET /api/admin/purchases` with query params
- Payout breakdown shows gross, processor+platform fees, and net amount
- Status badges: created=gray, paid=green, failed=red, refunded=amber
- Click-through to purchase detail works
- Pagination with offset-based navigation
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
Audit log entry created for each purchase list view.
{/traklet:section:notes}
