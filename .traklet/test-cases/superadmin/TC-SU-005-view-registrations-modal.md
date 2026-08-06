---
id: TC-SU-005
title: View registrations modal for a DirectStream
priority: medium
labels:
  - superadmin
  - direct-stream
  - registrations
suite: superadmin
backend-id: "194"
last-synced: "2026-08-05T21:31:57.589Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify clicking the registrations count link on a stream row opens a modal showing the stream title and registration count, and that the modal can be closed.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one DirectStream with registrations (or test with zero)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/superadmin/direct-streams`
2. Find a stream row with a registrations count link (`btn-registrations-{slug}`)
3. Click the registrations count link
4. Verify modal appears (`modal-registrations`)
5. Verify modal header shows stream title + "- Registrations"
6. Verify total registration count is displayed
7. Click "Close" button (`btn-close-registrations`)
8. Verify modal closes and table is still visible
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Modal opens with correct stream title and registration count
- Close button dismisses modal cleanly
- If zero registrations, modal still opens with count of 0
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
Registrations modal is currently a placeholder (no detailed list). Verify it at least shows the count without errors.
<span style="display:none">{/traklet:section:notes}</span>
