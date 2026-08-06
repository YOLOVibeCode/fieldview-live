---
id: TC-SU-002
title: Create DirectStream via superadmin form
priority: critical
labels:
  - superadmin
  - direct-stream
  - crud
suite: superadmin
backend-id: "191"
last-synced: "2026-08-05T21:31:54.049Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify a superadmin can create a new DirectStream using the drawer form on `https://dev.fieldview.live/superadmin/direct-streams`, with all fields validated and the new stream appearing in the table on success.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- No existing stream with the test slug (or use a unique slug per run)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/superadmin/direct-streams`
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
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Drawer opens with empty form
- Submit button disabled/loading during API call
- On success: drawer closes, table refreshes with new row showing correct slug link, title, and feature icons
- Stream slug links to `/{slug}` in new tab
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
Clean up test streams after test run to avoid slug conflicts on re-run.
<span style="display:none">{/traklet:section:notes}</span>
