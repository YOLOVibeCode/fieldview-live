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
backend-id: "200"
last-synced: "2026-08-05T21:32:04.483Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify a superadmin can permanently hard-delete a sub-event via the Hard Delete button, with an extra-stern confirmation dialog warning that this cannot be undone.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- A sub-event that is safe to permanently destroy (test data only)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Expand a stream row with a sub-event
2. Locate the event row (`row-event-{eventSlug}`)
3. Click "Hard Delete" button (`btn-hard-delete-event-{eventSlug}`) — red button
4. Verify stern confirmation dialog: "PERMANENTLY DELETE this event? This cannot be undone!"
5. Confirm the action
6. Verify API call: `DELETE /api/admin/direct-streams/{id}/events/{eventId}?hard=true` returns 200
7. Verify the event is completely removed from the events table
8. Verify the event does NOT appear under any status filter (truly gone)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Extra-stern confirmation prevents accidental permanent deletion
- Hard delete removes the database record entirely
- Event is not recoverable after hard delete
- No orphaned references (registrations, chat, etc.)
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
DESTRUCTIVE action — only test with throwaway data. Never hard-delete production events without explicit approval.
<span style="display:none">{/traklet:section:notes}</span>
