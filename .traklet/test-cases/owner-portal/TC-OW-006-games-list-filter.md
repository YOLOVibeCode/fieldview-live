---
id: TC-OW-006
title: Owner games list loads with status filter and pagination
priority: critical
labels:
  - owner
  - games
  - read
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the `/owners/games` page lists the owner's games in a table with status filter and pagination.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-OA-001 session (authenticated owner)
- At least one game created (TC-OW-002)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/owners/games`
2. Verify table loads with columns: title, teams, date, state badge, price
3. Verify state badges show correct colors (draft=gray, active=blue, live=green, ended=muted, cancelled=red)
4. Use the status filter dropdown — select "active", verify table filters
5. Switch to "draft", then "all" — verify each re-fetches correctly
6. Verify total count label updates with each filter
7. If 20+ games: verify pagination (Previous/Next buttons, page number)
8. Verify "+ Create New Game" button links to `/owners/games/new`
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Games load from `GET /api/owners/games?page=1&limit=20&state=...`
- Each filter change triggers a new API call
- Pagination controls work (Previous disabled on page 1, Next disabled on last page)
- Empty state shown if no games match the filter
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
Dashboard "Games" card now links here instead of `/owners/games/new`.
{/traklet:section:notes}
