---
id: TC-OW-011
title: Owner deletes game with confirmation
priority: high
labels:
  - owner
  - games
  - delete
  - destructive
suite: owner-portal
backend-id: "174"
last-synced: "2026-08-05T21:31:34.248Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify an owner can delete a game via the Delete button, with a confirmation modal preventing accidental deletion.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-OW-006 (games list loads)
- A game that is safe to delete (test data)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. On `https://dev.fieldview.live/owners/games`, click "Delete" button on a game row
2. Verify confirmation modal appears with warning text ("cannot be undone")
3. Click "Cancel" — verify modal closes, game still in table
4. Click "Delete" again, then confirm in modal
5. Verify `DELETE /api/owners/games/:id` is called
6. Verify game is removed from the table
7. Verify total count decrements
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Confirmation modal prevents accidental deletion
- Cancel closes modal without action
- Confirm sends DELETE and removes game from list
- Loading state shown during deletion ("Deleting…")
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
DESTRUCTIVE — only test with throwaway data. Deletion removes the game and all associated data permanently.
<span style="display:none">{/traklet:section:notes}</span>
