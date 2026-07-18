---
id: TC-SU-006
title: Create stream form shows validation errors
priority: medium
labels:
  - superadmin
  - direct-stream
  - validation
suite: superadmin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the create stream drawer form surfaces inline validation errors for invalid or missing inputs, and that submission is blocked until errors are resolved.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/superadmin/direct-streams`
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
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Client-side Zod validation shows inline errors for each invalid field
- Server-side 409 for duplicate slug shows as error toast
- Cancel resets form state completely
- No partial stream creation on validation failure
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
Test both client-side validation (instant) and server-side validation (after submit).
{/traklet:section:notes}
