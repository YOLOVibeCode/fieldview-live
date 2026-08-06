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
backend-id: "198"
last-synced: "2026-08-05T21:32:02.245Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify a superadmin can archive an active sub-event via the Archive button, with a confirmation dialog, and that the event's status badge changes to yellow/archived.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one active sub-event (create one via TC-SU-008 if needed)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Expand a stream row with an active sub-event
2. Locate the event row (`row-event-{eventSlug}`)
3. Click "Archive" button (`btn-archive-event-{eventSlug}`)
4. Verify confirmation dialog appears: "Archive this event?"
5. Confirm the action
6. Verify API call: `POST /api/admin/direct-streams/{id}/events/{eventId}/archive` returns 200
7. Verify the event's status badge changes from green (active) to yellow (archived)
8. Verify the event remains visible in the table (soft operation)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Confirmation dialog prevents accidental archival
- After confirmation, event status updates in-place
- Archived events are still visible but marked with yellow badge
- Archive action is idempotent (archiving an already-archived event is safe)
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
Archived events may be filtered out if the events list only shows active by default — verify filter behavior.
<span style="display:none">{/traklet:section:notes}</span>
