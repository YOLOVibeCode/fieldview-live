---
id: TC-EX-001
title: Expired purchase or ended game denies playback clearly
priority: high
labels:
  - edge
  - access
suite: edge-cases
backend-id: "161"
last-synced: "2026-08-05T21:31:18.967Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
After game end time or access TTL, viewer sees explicit messaging instead of broken player.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Fixture: past-ended game OR artificially expired access token (staging)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/direct/[slug]` (or `https://dev.fieldview.live/game/[gameId]`) that previously worked
2. Observe copy for ended game / expired access / code expired scenarios
3. Confirm no infinite spinner on video element
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
User-safe terminal state; optional CTA to buy another event or contact support.
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
Align expected strings with product copy deck; file bug if 500 instead of 4xx UX.
<span style="display:none">{/traklet:section:notes}</span>
