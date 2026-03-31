---
id: TC-SB-003
title: Scoreboard initial setup with producer password
priority: medium
labels:
  - scoreboard
  - admin
  - setup
suite: scoreboard
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that the first-time scoreboard setup creates a scoreboard with a producer password via the admin panel, enabling subsequent score updates from producers.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- A direct stream with `scoreboardEnabled: true` but no scoreboard created yet
- Admin panel unlocked (TC-AD-001)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to a direct stream with scoreboard enabled
2. Unlock admin panel (TC-AD-001)
3. Find scoreboard setup section in admin panel
4. Enter producer password and team names
5. Submit — verify `POST /api/direct/{slug}/scoreboard/setup` called with admin JWT
6. Verify scoreboard appears on the stream page with team names and 0-0 score
7. Validate producer password — `POST /api/direct/{slug}/scoreboard/validate`
8. Update score with producer password — verify real-time push to viewers
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Scoreboard setup requires admin JWT
- Producer password is set for future score updates
- After setup, scoreboard renders with team names and initial 0-0 score
- Producer password can be validated independently
- Subsequent score updates work via producer password or admin JWT
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
Prerequisite for TC-SB-001 (real-time updates) and TC-SB-002 (clock controls). Scoreboard setup is a one-time operation per stream.
{/traklet:section:notes}
