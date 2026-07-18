---
id: TC-CN-008
title: Game audience page loads with purchasers and watchers
priority: high
labels:
  - admin
  - audience
  - analytics
suite: admin-console
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the game audience page displays purchasers, watchers, and purchase-to-watch conversion rate for a given game, accessed via admin navigation.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated admin)
- A game with known purchasers and/or watchers in the test environment
- Known ownerId and gameId for navigation
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/admin/owners/{ownerId}/games/{gameId}/audience`
2. Verify page header shows "Audience" with owner/game IDs
3. Verify Purchasers card:
   - Shows "Purchase→watch conversion: X.X%"
   - Lists purchasers with email (masked/unmasked per role), purchase date, watched status
   - Or shows "No purchasers." empty state
4. Verify Watchers card:
   - Lists watchers with email, last watched date (or "—"), session count
   - Or shows "No watchers." empty state
5. Click "Back" button — verify return to `/admin/console`
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Audience page loads via `GET /api/admin/owners/{ownerId}/games/{gameId}/audience`
- Purchasers and watchers lists render correctly
- Conversion rate is calculated and displayed as percentage
- Email visibility matches admin role (masked for support, full for super)
- Audit log entry created for `view_audience`
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
This page is typically reached via search results or direct URL. Verify both access paths if possible.
{/traklet:section:notes}
