---
id: TC-OW-010
title: Owner edits game properties inline
priority: high
labels:
  - owner
  - games
  - update
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify an owner can click a game row to expand an inline edit form, modify game properties, save changes, and see the table update.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-OW-006 (games list loads)
- At least one game in the list
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. On `/owners/games`, click a game row
2. Verify inline edit form expands below the row
3. Verify form pre-fills with current values (title, teams, start time, price, state)
4. Change the title and price
5. Click "Save Changes"
6. Verify `PATCH /api/owners/games/:id` is called
7. Verify the row updates with new values (no page reload)
8. Click the row again to collapse the edit form
9. Click "Cancel" on an open edit — verify form closes without saving
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Click toggles expand/collapse of inline edit form
- Save sends PATCH with only changed fields
- Table row updates in-place after successful save
- Cancel discards unsaved changes
- Keyword code and game ID shown in edit form footer for reference
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
State dropdown allows changing game lifecycle (draft → active → live → ended).
{/traklet:section:notes}
