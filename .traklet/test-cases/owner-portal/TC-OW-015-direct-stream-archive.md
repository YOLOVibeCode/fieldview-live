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
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify an owner can archive an active direct stream, which changes its status badge and removes it from the active filter view.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-OW-009 (direct streams list loads)
- An active direct stream that is safe to archive (test data)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. On `/owners/direct-streams` with "Active" filter selected
2. Click "Archive" button on a stream row
3. Verify `POST /api/owners/direct-streams/:id/archive` is called
4. Verify the stream disappears from the active list (or status badge changes to yellow)
5. Switch filter to "Archived" — verify the stream appears there
6. Switch filter to "All" — verify the stream shows with archived badge
7. Verify the "Archive" button is not shown for already-archived streams
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Archive is a soft operation (stream is not deleted)
- Status changes from "active" to "archived"
- Stream removed from active filter, visible in archived/all filters
- Archive button only shown for active streams
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
Archiving is reversible (unlike deletion). The stream page still loads but may show a different status.
{/traklet:section:notes}
