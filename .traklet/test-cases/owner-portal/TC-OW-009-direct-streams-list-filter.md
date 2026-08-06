---
id: TC-OW-009
title: Owner direct streams list with status filter
priority: high
labels:
  - owner
  - direct-stream
  - read
suite: owner-portal
backend-id: "172"
last-synced: "2026-08-05T21:31:31.891Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the `https://dev.fieldview.live/owners/direct-streams` page lists the owner's direct streams in a table with status filtering.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-OA-001 session (authenticated owner)
- At least one direct stream exists
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/owners/direct-streams`
2. Verify table loads with columns: slug, title, scheduled, status badge, features, actions
3. Verify slug links open `https://dev.fieldview.live/direct/{slug}` in a new tab
4. Verify feature icons show correctly (chat, scoreboard, paywall with price)
5. Use status filter — switch between Active, Archived, All
6. Verify table re-renders with filtered results and count updates
7. If no streams: verify empty state message
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Streams load from `GET /api/owners/direct-streams?status=active`
- Status badges: green=active, yellow=archived
- Filter changes trigger new API calls
- Slug links are valid and open correctly
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
Distinct from superadmin streams (TC-SU-*) — this is owner-scoped and shows only their own streams.
<span style="display:none">{/traklet:section:notes}</span>
