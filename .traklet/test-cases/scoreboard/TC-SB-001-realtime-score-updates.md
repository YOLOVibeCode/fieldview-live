---
id: TC-SB-001
title: Scoreboard updates in real-time via SSE
priority: critical
labels:
  - scoreboard
  - sse
  - smoke
suite: scoreboard
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that scoreboard changes made by the producer are pushed to all viewers in real-time via SSE.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Active direct stream with scoreboard enabled
- Admin/producer access to update scores
- At least one viewer connected
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open the stream as a viewer in one window
2. Open the admin panel in another window (unlock with owner password)
3. Update the home team score via the admin panel
4. Observe the viewer's scoreboard overlay
5. Update the away team score
6. Observe the viewer again
7. Change a team name
8. Observe the viewer again
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Score changes appear on the viewer's scoreboard within 1-2 seconds. SSE event type is `scoreboard_update`. Team name changes are reflected immediately. No page refresh needed.
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
InMemoryScoreboardPubSub. SSE endpoint: `GET /api/direct/:slug/scoreboard/stream`. Type coercion: scores are parsed int, names are trimmed strings.
{/traklet:section:notes}
