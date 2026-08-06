---
id: TC-GM-001
title: Public game page loads by game ID
priority: high
labels:
  - viewer
  - games
suite: game-page
backend-id: "163"
last-synced: "2026-08-05T21:31:21.380Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
`https://dev.fieldview.live/game/{gameId}` (public route) resolves for an active or scheduled game and shows the correct purchase/watch entry state.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Known `gameId` UUID or slug per routing in target env
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/game/{gameId}`
2. Confirm hero/metadata matches expected matchup
3. Verify paywall vs free vs post-purchase UI per game config
4. Check Network for failed bootstrap calls
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
200 for valid id; coherent 404 for unknown id. No broken layout.
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
Cross-links to **TC-CW-*** when purchase starts from this page.
<span style="display:none">{/traklet:section:notes}</span>
