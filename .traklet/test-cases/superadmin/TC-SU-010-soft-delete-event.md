---
id: TC-SU-010
title: Soft delete a sub-event
priority: medium
labels:
  - superadmin
  - direct-stream
  - events
  - lifecycle
suite: superadmin
backend-id: "199"
last-synced: "2026-08-05T21:32:03.332Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify a superadmin can soft-delete a sub-event via the Delete button, with a confirmation dialog, and that the event is removed from the active events list.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one active or archived sub-event
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Expand a stream row with a sub-event
2. Locate the event row (`row-event-{eventSlug}`)
3. Click "Delete" button (`btn-delete-event-{eventSlug}`)
4. Verify confirmation dialog appears: "Delete this event?"
5. Confirm the action
6. Verify API call: `DELETE /api/admin/direct-streams/{id}/events/{eventId}?hard=false` returns 200
7. Verify the event is removed from the active events table
8. Switch status filter to "Deleted" if available — verify event appears there
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Confirmation dialog prevents accidental deletion
- Soft delete sets status to deleted, does not remove from database
- Event disappears from active list
- Sub-events count decrements
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
Soft-deleted events can potentially be recovered. Distinguish from hard delete (TC-SU-011).
<span style="display:none">{/traklet:section:notes}</span>
