---
id: TC-OW-015
title: Owner archives a direct stream
priority: high
labels:
  - owner
  - direct-stream
  - archive
  - lifecycle
suite: owner-portal
backend-id: "178"
last-synced: "2026-08-05T21:31:38.779Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify an owner can archive an active direct stream, which changes its status badge and removes it from the active filter view.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-OW-009 (direct streams list loads)
- An active direct stream that is safe to archive (test data)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. On `https://dev.fieldview.live/owners/direct-streams` with "Active" filter selected
2. Click "Archive" button on a stream row
3. Verify `POST /api/owners/direct-streams/:id/archive` is called
4. Verify the stream disappears from the active list (or status badge changes to yellow)
5. Switch filter to "Archived" — verify the stream appears there
6. Switch filter to "All" — verify the stream shows with archived badge
7. Verify the "Archive" button is not shown for already-archived streams
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Archive is a soft operation (stream is not deleted)
- Status changes from "active" to "archived"
- Stream removed from active filter, visible in archived/all filters
- Archive button only shown for active streams
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
Archiving is reversible (unlike deletion). The stream page still loads but may show a different status.
<span style="display:none">{/traklet:section:notes}</span>
