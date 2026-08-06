---
id: TC-SU-008
title: Create sub-event under a DirectStream
priority: critical
labels:
  - superadmin
  - direct-stream
  - events
  - crud
suite: superadmin
backend-id: "197"
last-synced: "2026-08-05T21:32:01.104Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify a superadmin can create a new sub-event under a DirectStream using the inline event creation form within the expanded row.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one active DirectStream (expand row per TC-SU-007)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Expand a stream row to reveal EventManagement
2. Click "+ New Event" toggle (`btn-toggle-create-event-{slug}`)
3. Verify create form appears (`form-create-event-{slug}`)
4. Fill in required fields:
   - Event Slug (`input-event-slug`): e.g. `soccer-20260401-test`
   - Title (`input-event-title`): e.g. "Test Game - Apr 1, 2026"
5. Optionally fill:
   - Scheduled Start (`input-event-scheduled`): datetime-local value
   - Stream URL (`input-event-stream-url`): valid HLS URL or leave blank to inherit
6. Toggle "Publicly Listed" checkbox (`checkbox-event-listed`)
7. Click "Create Event" (`btn-submit-event`)
8. Verify form clears and new event appears in the events table
9. Verify event row shows correct slug, title, scheduled date, and "active" status badge
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Form validates required fields (slug, title)
- Event slug is forced to lowercase
- API call: `POST /api/admin/direct-streams/{id}/events` returns 201
- New event row appears in table without page reload
- Sub-events count in header increments
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
Event slug must be lowercase alphanumeric with hyphens only. Helper text under input confirms this.
<span style="display:none">{/traklet:section:notes}</span>
