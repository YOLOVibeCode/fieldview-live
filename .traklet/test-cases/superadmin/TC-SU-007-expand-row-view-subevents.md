---
id: TC-SU-007
title: Expand stream row to view sub-events
priority: high
labels:
  - superadmin
  - direct-stream
  - events
suite: superadmin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify clicking the expand toggle on a stream row loads the EventManagement component showing the stream's sub-events table, or an empty state if none exist.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one DirectStream (ideally one with sub-events and one without)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/superadmin/direct-streams`
2. Click the expand button on a stream row (`btn-expand-{slug}`)
3. Verify the icon changes from "▶" to "▼"
4. Verify EventManagement component loads below the row (`row-event-{slug}`)
5. If stream has events: verify events table renders (`table-events-{slug}`) with correct columns (slug, title, scheduled, status, actions)
6. If stream has no events: verify empty state message (`empty-events-{slug}`)
7. Verify "Sub-Events (X)" header shows correct count
8. Click expand button again to collapse
9. Verify EventManagement component is hidden
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Expand/collapse toggles EventManagement visibility
- Events fetched via `GET /api/admin/direct-streams/{id}/events`
- Events table shows slug link, title, scheduled date, status badge, and action buttons
- Status badges: green (active), yellow (archived), red (deleted)
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
Event slug links should open `/direct/{parentSlug}/{eventSlug}` in a new tab.
{/traklet:section:notes}
