---
id: TC-SU-006
title: Create stream form shows validation errors
priority: medium
labels:
  - superadmin
  - direct-stream
  - validation
suite: superadmin
backend-id: "195"
last-synced: "2026-08-05T21:31:58.754Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the create stream drawer form surfaces inline validation errors for invalid or missing inputs, and that submission is blocked until errors are resolved.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/superadmin/direct-streams`
2. Click "+ Create Stream" (`btn-create-stream`)
3. Leave all fields empty, click "Create Stream" (`btn-submit-create`)
4. Verify inline errors appear for slug (`error-slug`), title (`error-title`), and admin password (`error-admin-password`)
5. Enter a slug with uppercase or special characters (e.g. "BAD SLUG!")
6. Verify slug validation error (must be lowercase alphanumeric with dashes)
7. Enter a password shorter than 8 characters
8. Verify password validation error
9. Enter an invalid stream URL (e.g. "not-a-url")
10. Verify stream URL validation error (`error-stream-url`)
11. Enter a slug that already exists in the system
12. Submit — verify 409 Conflict error toast appears
13. Click "Cancel" (`btn-close-create`) — verify drawer closes and form resets
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Client-side Zod validation shows inline errors for each invalid field
- Server-side 409 for duplicate slug shows as error toast
- Cancel resets form state completely
- No partial stream creation on validation failure
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
Test both client-side validation (instant) and server-side validation (after submit).
<span style="display:none">{/traklet:section:notes}</span>
