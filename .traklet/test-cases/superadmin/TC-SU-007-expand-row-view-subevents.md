---
id: TC-SU-007
title: Expand stream row to view sub-events
priority: high
labels:
  - superadmin
  - direct-stream
  - events
suite: superadmin
backend-id: "196"
last-synced: "2026-08-05T21:31:59.981Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify clicking the expand toggle on a stream row loads the EventManagement component showing the stream's sub-events table, or an empty state if none exist.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one DirectStream (ideally one with sub-events and one without)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/superadmin/direct-streams`
2. Click the expand button on a stream row (`btn-expand-{slug}`)
3. Verify the icon changes from "▶" to "▼"
4. Verify EventManagement component loads below the row (`row-event-{slug}`)
5. If stream has events: verify events table renders (`table-events-{slug}`) with correct columns (slug, title, scheduled, status, actions)
6. If stream has no events: verify empty state message (`empty-events-{slug}`)
7. Verify "Sub-Events (X)" header shows correct count
8. Click expand button again to collapse
9. Verify EventManagement component is hidden
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Expand/collapse toggles EventManagement visibility
- Events fetched via `GET /api/admin/direct-streams/{id}/events`
- Events table shows slug link, title, scheduled date, status badge, and action buttons
- Status badges: green (active), yellow (archived), red (deleted)
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
Event slug links should open `https://dev.fieldview.live/direct/{parentSlug}/{eventSlug}` in a new tab.
<span style="display:none">{/traklet:section:notes}</span>
