---
id: TC-SB-002
title: Scoreboard clock start, pause, and reset
priority: high
labels:
  - scoreboard
  - clock
suite: scoreboard
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that the game clock can be started, paused, and reset from the admin panel and updates are pushed to viewers.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Active direct stream with scoreboard enabled
- Admin panel access
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open admin panel and viewer window side by side
2. Click "Start Clock" in admin panel
3. Verify clock ticks on both admin and viewer
4. Click "Pause Clock"
5. Verify clock stops on both sides at the same value
6. Click "Reset Clock"
7. Verify clock resets to initial value on both sides
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Clock state changes are published via scoreboard SSE. Start/pause/reset all propagate within 1-2 seconds. Clock values stay in sync between admin and viewer.
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
Clock operations publish via InMemoryScoreboardPubSub same as score updates.
{/traklet:section:notes}
