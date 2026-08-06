---
id: TC-AA-003
title: Admin login with invalid credentials shows error
priority: high
labels:
  - auth
  - admin
  - negative
suite: auth-admin
backend-id: "135"
last-synced: "2026-08-05T21:30:48.597Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that submitting incorrect credentials on the admin login page shows an error banner, does not create a session, and does not redirect to the console.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Admin login page accessible at `https://dev.fieldview.live/admin/login`
- Known valid admin email (to test wrong password)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/admin/login`
2. Enter a valid admin email and an incorrect password
3. Click "Sign in"
4. Verify error banner appears with authentication failure message
5. Verify URL remains on `https://dev.fieldview.live/admin/login` (no redirect)
6. Verify no session token in localStorage
7. Enter a completely unknown email and any password
8. Click "Sign in"
9. Verify error banner appears (same generic message — no email enumeration)
10. Dismiss error banner and verify form is still usable
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Error banner displayed for both wrong-password and unknown-email cases
- Error message is generic (does not reveal whether email exists)
- No session token created — localStorage is clean
- Form remains interactive after error (can retry)
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
Verify no information leakage — error messages should not differentiate between "email not found" and "wrong password."
<span style="display:none">{/traklet:section:notes}</span>
