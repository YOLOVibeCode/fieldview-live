---
id: TC-CN-005
title: Console search with no results shows empty state
priority: medium
labels:
  - admin
  - search
  - empty-state
suite: admin-console
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that searching for a query with no matches displays appropriate empty state messages for viewers, games, and purchases — no errors or broken layout.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated admin)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/admin/console`
2. Enter a query guaranteed to have no matches (e.g. `zzz-nonexistent-12345@fake.test`)
3. Click "Search" or press Enter
4. Verify search completes without error (no error banner)
5. Verify Viewers card shows "No viewer matches."
6. Verify Games card shows "No game matches."
7. Verify Purchases section is hidden or shows empty state
8. Verify layout is intact — cards render properly with empty content
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Search returns 200 with empty arrays
- Each result section shows its empty state message
- No 500 errors, no broken layout, no console errors
- Search input retains the query for re-editing
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
Good UX test — empty states should be informative, not confusing.
{/traklet:section:notes}
