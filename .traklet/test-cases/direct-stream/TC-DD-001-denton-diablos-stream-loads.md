---
id: TC-DD-001
title: Denton Diablos event page loads and admin unlocks
priority: high
labels:
  - direct-stream
  - admin
  - routing
suite: direct-stream
backend-id: "156"
last-synced: "2026-08-05T21:31:13.005Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Confirm the Denton Diablos event page at `https://dev.fieldview.live/direct/dentondiablos/soccer-2008-20260325` loads correctly, displays scoreboard defaults, and that the admin panel can be unlocked with the correct password.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Seed endpoint has been called: `POST /api/admin/seed/denton-diablos-mar25`
- Network access to production (`https://dev.fieldview.live`)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/direct/dentondiablos/soccer-2008-20260325`
2. Wait for page to fully load (player region, scoreboard shell, chat panel)
3. Verify scoreboard shows **Denton Diablos** as home team
4. Click the admin panel button (`data-testid="btn-open-admin-panel"`)
5. Enter password `devil2026` and submit
6. Confirm admin panel unlocks — producer controls and stream URL input become visible
7. Optionally set a test stream URL, click Save, confirm no error
8. Refresh the page and repeat admin login to verify password round-trips
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Page returns 200 with player area, scoreboard, and chat visible
- Scoreboard defaults: home "Denton Diablos" (#CC0000) vs "Away" (#333333)
- Admin unlock succeeds with `devil2026`; wrong passwords are rejected
- Stream URL save persists across refresh
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
Mirrors TCHS event test flow (**TC-DS-001**). Parent slug `dentondiablos`, event slug `soccer-2008-20260325`. See also Playwright spec `tests/e2e/denton-diablos-event-admin.spec.ts`.
<span style="display:none">{/traklet:section:notes}</span>
