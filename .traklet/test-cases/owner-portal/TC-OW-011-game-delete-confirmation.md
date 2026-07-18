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
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify an owner can delete a game via the Delete button, with a confirmation modal preventing accidental deletion.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-OW-006 (games list loads)
- A game that is safe to delete (test data)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. On `/owners/games`, click "Delete" button on a game row
2. Verify confirmation modal appears with warning text ("cannot be undone")
3. Click "Cancel" — verify modal closes, game still in table
4. Click "Delete" again, then confirm in modal
5. Verify `DELETE /api/owners/games/:id` is called
6. Verify game is removed from the table
7. Verify total count decrements
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Confirmation modal prevents accidental deletion
- Cancel closes modal without action
- Confirm sends DELETE and removes game from list
- Loading state shown during deletion ("Deleting…")
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
DESTRUCTIVE — only test with throwaway data. Deletion removes the game and all associated data permanently.
{/traklet:section:notes}
