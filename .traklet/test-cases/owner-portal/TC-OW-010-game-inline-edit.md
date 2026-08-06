---
id: TC-OW-010
title: Owner edits game properties inline
priority: high
labels:
  - owner
  - games
  - update
suite: owner-portal
backend-id: "173"
last-synced: "2026-08-05T21:31:32.995Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify an owner can click a game row to expand an inline edit form, modify game properties, save changes, and see the table update.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-OW-006 (games list loads)
- At least one game in the list
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. On `https://dev.fieldview.live/owners/games`, click a game row
2. Verify inline edit form expands below the row
3. Verify form pre-fills with current values (title, teams, start time, price, state)
4. Change the title and price
5. Click "Save Changes"
6. Verify `PATCH /api/owners/games/:id` is called
7. Verify the row updates with new values (no page reload)
8. Click the row again to collapse the edit form
9. Click "Cancel" on an open edit — verify form closes without saving
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Click toggles expand/collapse of inline edit form
- Save sends PATCH with only changed fields
- Table row updates in-place after successful save
- Cancel discards unsaved changes
- Keyword code and game ID shown in edit form footer for reference
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
State dropdown allows changing game lifecycle (draft → active → live → ended).
<span style="display:none">{/traklet:section:notes}</span>
