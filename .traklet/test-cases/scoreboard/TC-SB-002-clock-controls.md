---
id: TC-SB-002
title: Scoreboard clock start, pause, and reset
priority: high
labels:
  - scoreboard
  - clock
suite: scoreboard
backend-id: "182"
last-synced: "2026-08-05T21:31:43.485Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that the game clock can be started, paused, and reset from the admin panel and updates are pushed to viewers.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Active direct stream with scoreboard enabled
- Admin panel access
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/direct/[slug]` as viewer in one window and unlock the admin panel in another
2. Click "Start Clock" in admin panel
3. Verify clock ticks on both admin and viewer
4. Click "Pause Clock"
5. Verify clock stops on both sides at the same value
6. Click "Reset Clock"
7. Verify clock resets to initial value on both sides
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Clock state changes are published via scoreboard SSE. Start/pause/reset all propagate within 1-2 seconds. Clock values stay in sync between admin and viewer.
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
Clock operations publish via InMemoryScoreboardPubSub same as score updates.
<span style="display:none">{/traklet:section:notes}</span>
