---
id: TC-CN-008
title: Game audience page loads with purchasers and watchers
priority: high
labels:
  - admin
  - audience
  - analytics
suite: admin-console
backend-id: "126"
last-synced: "2026-08-05T21:30:38.000Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the game audience page displays purchasers, watchers, and purchase-to-watch conversion rate for a given game, accessed via admin navigation.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated admin)
- A game with known purchasers and/or watchers in the test environment
- Known ownerId and gameId for navigation
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/admin/owners/{ownerId}/games/{gameId}/audience`
2. Verify page header shows "Audience" with owner/game IDs
3. Verify Purchasers card:
   - Shows "Purchase→watch conversion: X.X%"
   - Lists purchasers with email (masked/unmasked per role), purchase date, watched status
   - Or shows "No purchasers." empty state
4. Verify Watchers card:
   - Lists watchers with email, last watched date (or "—"), session count
   - Or shows "No watchers." empty state
5. Click "Back" button — verify return to `https://dev.fieldview.live/admin/console`
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Audience page loads via `GET /api/admin/owners/{ownerId}/games/{gameId}/audience`
- Purchasers and watchers lists render correctly
- Conversion rate is calculated and displayed as percentage
- Email visibility matches admin role (masked for support, full for super)
- Audit log entry created for `view_audience`
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
This page is typically reached via search results or direct URL. Verify both access paths if possible.
<span style="display:none">{/traklet:section:notes}</span>
