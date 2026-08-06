---
id: TC-OW-006
title: Owner games list loads with status filter and pagination
priority: critical
labels:
  - owner
  - games
  - read
suite: owner-portal
backend-id: "169"
last-synced: "2026-08-05T21:31:28.592Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the `https://dev.fieldview.live/owners/games` page lists the owner's games in a table with status filter and pagination.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-OA-001 session (authenticated owner)
- At least one game created (TC-OW-002)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/owners/games`
2. Verify table loads with columns: title, teams, date, state badge, price
3. Verify state badges show correct colors (draft=gray, active=blue, live=green, ended=muted, cancelled=red)
4. Use the status filter dropdown — select "active", verify table filters
5. Switch to "draft", then "all" — verify each re-fetches correctly
6. Verify total count label updates with each filter
7. If 20+ games: verify pagination (Previous/Next buttons, page number)
8. Verify "+ Create New Game" button links to `https://dev.fieldview.live/owners/games/new`
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Games load from `GET /api/owners/games?page=1&limit=20&state=...`
- Each filter change triggers a new API call
- Pagination controls work (Previous disabled on page 1, Next disabled on last page)
- Empty state shown if no games match the filter
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
Dashboard "Games" card now links here instead of `https://dev.fieldview.live/owners/games/new`.
<span style="display:none">{/traklet:section:notes}</span>
