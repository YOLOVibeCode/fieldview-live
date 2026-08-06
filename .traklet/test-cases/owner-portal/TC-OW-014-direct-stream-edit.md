---
id: TC-OW-014
title: Owner edits direct stream properties inline
priority: high
labels:
  - owner
  - direct-stream
  - update
suite: owner-portal
backend-id: "177"
last-synced: "2026-08-05T21:31:37.638Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify an owner can expand a stream row to edit its title, stream URL, scheduled start, feature toggles, and paywall settings.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-OW-009 (direct streams list loads)
- At least one active direct stream
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. On `https://dev.fieldview.live/owners/direct-streams`, click a stream row
2. Verify inline edit form expands with pre-filled values
3. Change the title
4. Toggle chat, scoreboard, paywall, and listed checkboxes
5. Set a scheduled start time
6. Update the stream URL
7. Click "Save Changes"
8. Verify `PATCH /api/owners/direct-streams/:id` is called
9. Verify the row updates with new values
10. Click "Cancel" — verify form closes without saving
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Edit form pre-fills from current stream data
- Save sends PATCH with all modified fields
- Row updates in-place after successful save
- Cancel discards unsaved changes
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
Slug cannot be changed after creation. Admin password is not editable from this form.
<span style="display:none">{/traklet:section:notes}</span>
