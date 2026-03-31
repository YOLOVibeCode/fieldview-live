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
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify a superadmin can create a new sub-event under a DirectStream using the inline event creation form within the expanded row.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one active DirectStream (expand row per TC-SU-007)
{/traklet:section:prerequisites}

{traklet:section:steps}
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
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Form validates required fields (slug, title)
- Event slug is forced to lowercase
- API call: `POST /api/admin/direct-streams/{id}/events` returns 201
- New event row appears in table without page reload
- Sub-events count in header increments
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
Event slug must be lowercase alphanumeric with hyphens only. Helper text under input confirms this.
{/traklet:section:notes}
