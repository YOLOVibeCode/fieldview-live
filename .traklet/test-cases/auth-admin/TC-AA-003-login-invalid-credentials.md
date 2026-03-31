---
id: TC-AA-003
title: Admin login with invalid credentials shows error
priority: high
labels:
  - auth
  - admin
  - negative
suite: auth-admin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that submitting incorrect credentials on the admin login page shows an error banner, does not create a session, and does not redirect to the console.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Admin login page accessible at `/admin/login`
- Known valid admin email (to test wrong password)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/admin/login`
2. Enter a valid admin email and an incorrect password
3. Click "Sign in"
4. Verify error banner appears with authentication failure message
5. Verify URL remains on `/admin/login` (no redirect)
6. Verify no session token in localStorage
7. Enter a completely unknown email and any password
8. Click "Sign in"
9. Verify error banner appears (same generic message — no email enumeration)
10. Dismiss error banner and verify form is still usable
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Error banner displayed for both wrong-password and unknown-email cases
- Error message is generic (does not reveal whether email exists)
- No session token created — localStorage is clean
- Form remains interactive after error (can retry)
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
Verify no information leakage — error messages should not differentiate between "email not found" and "wrong password."
{/traklet:section:notes}
