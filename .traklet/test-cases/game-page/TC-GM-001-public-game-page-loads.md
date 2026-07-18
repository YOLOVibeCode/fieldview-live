---
id: TC-GM-001
title: Public game page loads by game ID
priority: high
labels:
  - viewer
  - games
suite: game-page
---

{traklet:test-case}

{traklet:section:objective}
## Objective
`/game/{gameId}` (public route) resolves for an active or scheduled game and shows the correct purchase/watch entry state.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Known `gameId` UUID or slug per routing in target env
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/game/{gameId}`
2. Confirm hero/metadata matches expected matchup
3. Verify paywall vs free vs post-purchase UI per game config
4. Check Network for failed bootstrap calls
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
200 for valid id; coherent 404 for unknown id. No broken layout.
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
Cross-links to **TC-CW-*** when purchase starts from this page.
{/traklet:section:notes}
