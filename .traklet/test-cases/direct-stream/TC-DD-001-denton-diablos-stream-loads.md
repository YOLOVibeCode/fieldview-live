---
id: TC-DD-001
title: Denton Diablos event page loads and admin unlocks
priority: high
labels:
  - direct-stream
  - admin
  - routing
suite: direct-stream
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Confirm the Denton Diablos event page at `/direct/dentondiablos/soccer-2008-20260325` loads correctly, displays scoreboard defaults, and that the admin panel can be unlocked with the correct password.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Seed endpoint has been called: `POST /api/admin/seed/denton-diablos-mar25`
- Network access to production (`https://fieldview.live`)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `https://fieldview.live/direct/dentondiablos/soccer-2008-20260325`
2. Wait for page to fully load (player region, scoreboard shell, chat panel)
3. Verify scoreboard shows **Denton Diablos** as home team
4. Click the admin panel button (`data-testid="btn-open-admin-panel"`)
5. Enter password `devil2026` and submit
6. Confirm admin panel unlocks — producer controls and stream URL input become visible
7. Optionally set a test stream URL, click Save, confirm no error
8. Refresh the page and repeat admin login to verify password round-trips
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Page returns 200 with player area, scoreboard, and chat visible
- Scoreboard defaults: home "Denton Diablos" (#CC0000) vs "Away" (#333333)
- Admin unlock succeeds with `devil2026`; wrong passwords are rejected
- Stream URL save persists across refresh
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
Mirrors TCHS event test flow (**TC-DS-001**). Parent slug `dentondiablos`, event slug `soccer-2008-20260325`. See also Playwright spec `tests/e2e/denton-diablos-event-admin.spec.ts`.
{/traklet:section:notes}
