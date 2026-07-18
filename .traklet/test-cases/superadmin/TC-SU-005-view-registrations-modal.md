---
id: TC-SU-005
title: View registrations modal for a DirectStream
priority: medium
labels:
  - superadmin
  - direct-stream
  - registrations
suite: superadmin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify clicking the registrations count link on a stream row opens a modal showing the stream title and registration count, and that the modal can be closed.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one DirectStream with registrations (or test with zero)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/superadmin/direct-streams`
2. Find a stream row with a registrations count link (`btn-registrations-{slug}`)
3. Click the registrations count link
4. Verify modal appears (`modal-registrations`)
5. Verify modal header shows stream title + "- Registrations"
6. Verify total registration count is displayed
7. Click "Close" button (`btn-close-registrations`)
8. Verify modal closes and table is still visible
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Modal opens with correct stream title and registration count
- Close button dismisses modal cleanly
- If zero registrations, modal still opens with count of 0
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
Registrations modal is currently a placeholder (no detailed list). Verify it at least shows the count without errors.
{/traklet:section:notes}
