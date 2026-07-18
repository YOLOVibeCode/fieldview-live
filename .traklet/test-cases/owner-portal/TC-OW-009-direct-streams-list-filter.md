---
id: TC-OW-009
title: Owner direct streams list with status filter
priority: high
labels:
  - owner
  - direct-stream
  - read
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the `/owners/direct-streams` page lists the owner's direct streams in a table with status filtering.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-OA-001 session (authenticated owner)
- At least one direct stream exists
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/owners/direct-streams`
2. Verify table loads with columns: slug, title, scheduled, status badge, features, actions
3. Verify slug links open `/direct/{slug}` in a new tab
4. Verify feature icons show correctly (chat, scoreboard, paywall with price)
5. Use status filter — switch between Active, Archived, All
6. Verify table re-renders with filtered results and count updates
7. If no streams: verify empty state message
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Streams load from `GET /api/owners/direct-streams?status=active`
- Status badges: green=active, yellow=archived
- Filter changes trigger new API calls
- Slug links are valid and open correctly
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
Distinct from superadmin streams (TC-SU-*) — this is owner-scoped and shows only their own streams.
{/traklet:section:notes}
