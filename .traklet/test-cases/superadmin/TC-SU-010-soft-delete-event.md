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
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify a superadmin can soft-delete a sub-event via the Delete button, with a confirmation dialog, and that the event is removed from the active events list.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one active or archived sub-event
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Expand a stream row with a sub-event
2. Locate the event row (`row-event-{eventSlug}`)
3. Click "Delete" button (`btn-delete-event-{eventSlug}`)
4. Verify confirmation dialog appears: "Delete this event?"
5. Confirm the action
6. Verify API call: `DELETE /api/admin/direct-streams/{id}/events/{eventId}?hard=false` returns 200
7. Verify the event is removed from the active events table
8. Switch status filter to "Deleted" if available — verify event appears there
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Confirmation dialog prevents accidental deletion
- Soft delete sets status to deleted, does not remove from database
- Event disappears from active list
- Sub-events count decrements
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
Soft-deleted events can potentially be recovered. Distinguish from hard delete (TC-SU-011).
{/traklet:section:notes}
