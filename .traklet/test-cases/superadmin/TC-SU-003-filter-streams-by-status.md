---
id: TC-SU-003
title: Filter streams table by status
priority: medium
labels:
  - superadmin
  - direct-stream
  - filter
suite: superadmin
backend-id: "192"
last-synced: "2026-08-05T21:31:55.228Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the status dropdown filter on the direct streams console correctly filters the table between Active, Archived, and Deleted streams.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one stream in each status (active, archived, deleted) — or accept empty state for missing statuses
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/superadmin/direct-streams`
2. Confirm default filter is "Active" (`select-status-filter`)
3. Verify table shows only active streams (count label matches rows)
4. Change filter to "Archived"
5. Verify table re-renders with archived streams (or empty state)
6. Change filter to "Deleted"
7. Verify table re-renders with deleted streams (or empty state)
8. Change back to "Active" — confirm original list returns
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Each filter change triggers a new API call (`GET /api/admin/direct-streams?status=...`)
- Table content changes to match selected status
- Count label updates to reflect filtered result count
- No 500 errors or stale data between switches
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
If no archived/deleted streams exist in test env, verify the empty state message renders correctly.
<span style="display:none">{/traklet:section:notes}</span>
