---
id: TC-SU-009
title: Archive a sub-event
priority: high
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
Verify a superadmin can archive an active sub-event via the Archive button, with a confirmation dialog, and that the event's status badge changes to yellow/archived.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one active sub-event (create one via TC-SU-008 if needed)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Expand a stream row with an active sub-event
2. Locate the event row (`row-event-{eventSlug}`)
3. Click "Archive" button (`btn-archive-event-{eventSlug}`)
4. Verify confirmation dialog appears: "Archive this event?"
5. Confirm the action
6. Verify API call: `POST /api/admin/direct-streams/{id}/events/{eventId}/archive` returns 200
7. Verify the event's status badge changes from green (active) to yellow (archived)
8. Verify the event remains visible in the table (soft operation)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Confirmation dialog prevents accidental archival
- After confirmation, event status updates in-place
- Archived events are still visible but marked with yellow badge
- Archive action is idempotent (archiving an already-archived event is safe)
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
Archived events may be filtered out if the events list only shows active by default — verify filter behavior.
{/traklet:section:notes}
