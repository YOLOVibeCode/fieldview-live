---
id: TC-SU-011
title: Hard delete a sub-event (permanent)
priority: high
labels:
  - superadmin
  - direct-stream
  - events
  - destructive
suite: superadmin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify a superadmin can permanently hard-delete a sub-event via the Hard Delete button, with an extra-stern confirmation dialog warning that this cannot be undone.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- A sub-event that is safe to permanently destroy (test data only)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Expand a stream row with a sub-event
2. Locate the event row (`row-event-{eventSlug}`)
3. Click "Hard Delete" button (`btn-hard-delete-event-{eventSlug}`) — red button
4. Verify stern confirmation dialog: "PERMANENTLY DELETE this event? This cannot be undone!"
5. Confirm the action
6. Verify API call: `DELETE /api/admin/direct-streams/{id}/events/{eventId}?hard=true` returns 200
7. Verify the event is completely removed from the events table
8. Verify the event does NOT appear under any status filter (truly gone)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Extra-stern confirmation prevents accidental permanent deletion
- Hard delete removes the database record entirely
- Event is not recoverable after hard delete
- No orphaned references (registrations, chat, etc.)
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
DESTRUCTIVE action — only test with throwaway data. Never hard-delete production events without explicit approval.
{/traklet:section:notes}
