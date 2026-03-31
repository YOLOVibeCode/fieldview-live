---
id: TC-CN-006
title: Console search by phone number (E.164)
priority: medium
labels:
  - admin
  - search
  - phone
suite: admin-console
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that searching by E.164 phone number returns matching viewer results with the phone number displayed.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated admin)
- A known viewer with a phone number in the test environment
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/admin/console`
2. Enter a known E.164 phone number (e.g. `+15551234567`) in the search input
3. Click "Search"
4. Verify Viewers card shows at least one match
5. Verify the matched viewer shows the phone number in the secondary line
6. Verify the viewer's email and purchase count are also displayed
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Phone number search returns matching viewer(s)
- Viewer card shows email (primary), phone (secondary), purchase count
- Search handles E.164 format correctly (with + prefix)
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
Ensure phone numbers without the + prefix are also handled gracefully, even if no match is found.
{/traklet:section:notes}
