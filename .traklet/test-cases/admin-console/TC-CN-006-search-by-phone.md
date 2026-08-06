---
id: TC-CN-006
title: Console search by phone number (E.164)
priority: medium
labels:
  - admin
  - search
  - phone
suite: admin-console
backend-id: "124"
last-synced: "2026-08-05T21:30:35.563Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that searching by E.164 phone number returns matching viewer results with the phone number displayed.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated admin)
- A known viewer with a phone number in the test environment
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/admin/console`
2. Enter a known E.164 phone number (e.g. `+15551234567`) in the search input
3. Click "Search"
4. Verify Viewers card shows at least one match
5. Verify the matched viewer shows the phone number in the secondary line
6. Verify the viewer's email and purchase count are also displayed
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Phone number search returns matching viewer(s)
- Viewer card shows email (primary), phone (secondary), purchase count
- Search handles E.164 format correctly (with + prefix)
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
Ensure phone numbers without the + prefix are also handled gracefully, even if no match is found.
<span style="display:none">{/traklet:section:notes}</span>
