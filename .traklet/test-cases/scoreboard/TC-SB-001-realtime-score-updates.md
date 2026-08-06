---
id: TC-SB-001
title: Scoreboard updates in real-time via SSE
priority: critical
labels:
  - scoreboard
  - sse
  - smoke
suite: scoreboard
backend-id: "181"
last-synced: "2026-08-05T21:31:42.283Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that scoreboard changes made by the producer are pushed to all viewers in real-time via SSE.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Active direct stream with scoreboard enabled
- Admin/producer access to update scores
- At least one viewer connected
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/direct/[slug]` as a viewer in one window
2. Open the admin panel in another window (unlock with owner password)
3. Update the home team score via the admin panel
4. Observe the viewer's scoreboard overlay
5. Update the away team score
6. Observe the viewer again
7. Change a team name
8. Observe the viewer again
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Score changes appear on the viewer's scoreboard within 1-2 seconds. SSE event type is `scoreboard_update`. Team name changes are reflected immediately. No page refresh needed.
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
InMemoryScoreboardPubSub. SSE endpoint: `GET /api/direct/:slug/scoreboard/stream`. Type coercion: scores are parsed int, names are trimmed strings.
<span style="display:none">{/traklet:section:notes}</span>
