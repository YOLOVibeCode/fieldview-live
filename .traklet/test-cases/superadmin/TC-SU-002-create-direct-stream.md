---
id: TC-SU-002
title: Create DirectStream via superadmin form
priority: critical
labels:
  - superadmin
  - direct-stream
  - crud
suite: superadmin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify a superadmin can create a new DirectStream using the drawer form on `/superadmin/direct-streams`, with all fields validated and the new stream appearing in the table on success.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- No existing stream with the test slug (or use a unique slug per run)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/superadmin/direct-streams`
2. Click "+ Create Stream" button (`btn-create-stream`)
3. Verify drawer modal appears (`drawer-create-stream`)
4. Fill in required fields:
   - Slug (`input-slug`): unique lowercase slug, e.g. `test-stream-001`
   - Title (`input-title`): e.g. "Test Stream 001"
   - Admin Password (`input-admin-password`): min 8 chars
5. Optionally fill Stream URL (`input-stream-url`) with a valid HLS URL
6. Toggle feature checkboxes: chat (`checkbox-chat-enabled`), scoreboard (`checkbox-scoreboard-enabled`), paywall (`checkbox-paywall-enabled`)
7. Click "Create Stream" (`btn-submit-create`)
8. Verify drawer closes and new stream row appears in the table
9. Verify the new row shows correct slug, title, and feature flags
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Drawer opens with empty form
- Submit button disabled/loading during API call
- On success: drawer closes, table refreshes with new row showing correct slug link, title, and feature icons
- Stream slug links to `/{slug}` in new tab
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
Clean up test streams after test run to avoid slug conflicts on re-run.
{/traklet:section:notes}
