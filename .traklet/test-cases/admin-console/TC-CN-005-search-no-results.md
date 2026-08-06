---
id: TC-CN-005
title: Console search with no results shows empty state
priority: medium
labels:
  - admin
  - search
  - empty-state
suite: admin-console
backend-id: "123"
last-synced: "2026-08-05T21:30:34.384Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that searching for a query with no matches displays appropriate empty state messages for viewers, games, and purchases — no errors or broken layout.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated admin)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/admin/console`
2. Enter a query guaranteed to have no matches (e.g. `zzz-nonexistent-12345@fake.test`)
3. Click "Search" or press Enter
4. Verify search completes without error (no error banner)
5. Verify Viewers card shows "No viewer matches."
6. Verify Games card shows "No game matches."
7. Verify Purchases section is hidden or shows empty state
8. Verify layout is intact — cards render properly with empty content
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Search returns 200 with empty arrays
- Each result section shows its empty state message
- No 500 errors, no broken layout, no console errors
- Search input retains the query for re-editing
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
Good UX test — empty states should be informative, not confusing.
<span style="display:none">{/traklet:section:notes}</span>
