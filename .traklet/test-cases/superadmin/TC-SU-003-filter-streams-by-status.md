---
id: TC-SU-003
title: Filter streams table by status
priority: medium
labels:
  - superadmin
  - direct-stream
  - filter
suite: superadmin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the status dropdown filter on the direct streams console correctly filters the table between Active, Archived, and Deleted streams.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one stream in each status (active, archived, deleted) — or accept empty state for missing statuses
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/superadmin/direct-streams`
2. Confirm default filter is "Active" (`select-status-filter`)
3. Verify table shows only active streams (count label matches rows)
4. Change filter to "Archived"
5. Verify table re-renders with archived streams (or empty state)
6. Change filter to "Deleted"
7. Verify table re-renders with deleted streams (or empty state)
8. Change back to "Active" — confirm original list returns
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Each filter change triggers a new API call (`GET /api/admin/direct-streams?status=...`)
- Table content changes to match selected status
- Count label updates to reflect filtered result count
- No 500 errors or stale data between switches
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
If no archived/deleted streams exist in test env, verify the empty state message renders correctly.
{/traklet:section:notes}
