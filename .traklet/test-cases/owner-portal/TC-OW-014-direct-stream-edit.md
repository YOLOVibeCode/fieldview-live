---
id: TC-OW-014
title: Owner edits direct stream properties inline
priority: high
labels:
  - owner
  - direct-stream
  - update
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify an owner can expand a stream row to edit its title, stream URL, scheduled start, feature toggles, and paywall settings.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-OW-009 (direct streams list loads)
- At least one active direct stream
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. On `/owners/direct-streams`, click a stream row
2. Verify inline edit form expands with pre-filled values
3. Change the title
4. Toggle chat, scoreboard, paywall, and listed checkboxes
5. Set a scheduled start time
6. Update the stream URL
7. Click "Save Changes"
8. Verify `PATCH /api/owners/direct-streams/:id` is called
9. Verify the row updates with new values
10. Click "Cancel" — verify form closes without saving
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Edit form pre-fills from current stream data
- Save sends PATCH with all modified fields
- Row updates in-place after successful save
- Cancel discards unsaved changes
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
Slug cannot be changed after creation. Admin password is not editable from this form.
{/traklet:section:notes}
