---
id: TC-SB-003
title: Scoreboard initial setup with producer password
priority: medium
labels:
  - scoreboard
  - admin
  - setup
suite: scoreboard
backend-id: "183"
last-synced: "2026-08-05T21:31:44.690Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that the first-time scoreboard setup creates a scoreboard with a producer password via the admin panel, enabling subsequent score updates from producers.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- A direct stream with `scoreboardEnabled: true` but no scoreboard created yet
- Admin panel unlocked (TC-AD-001)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/direct/[slug]` (a stream with `scoreboardEnabled: true`)
2. Unlock admin panel (TC-AD-001)
3. Find scoreboard setup section in admin panel
4. Enter producer password and team names
5. Submit — verify `POST /api/direct/{slug}/scoreboard/setup` called with admin JWT
6. Verify scoreboard appears on the stream page with team names and 0-0 score
7. Validate producer password — `POST /api/direct/{slug}/scoreboard/validate`
8. Update score with producer password — verify real-time push to viewers
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Scoreboard setup requires admin JWT
- Producer password is set for future score updates
- After setup, scoreboard renders with team names and initial 0-0 score
- Producer password can be validated independently
- Subsequent score updates work via producer password or admin JWT
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
Prerequisite for TC-SB-001 (real-time updates) and TC-SB-002 (clock controls). Scoreboard setup is a one-time operation per stream.
<span style="display:none">{/traklet:section:notes}</span>
