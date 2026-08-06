---
id: TC-PR-002
title: Password reset completion with new password
priority: high
labels:
  - account
  - auth
  - password
suite: account
backend-id: "119"
last-synced: "2026-08-05T21:30:29.566Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the `https://dev.fieldview.live/reset-password` page validates the reset token, enforces password strength requirements, and allows setting a new password that works for subsequent login.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-PR-001 completed (reset email received with token link)
- Valid reset token URL
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Click the reset link from the email (navigates to `https://dev.fieldview.live/reset-password?token=...`)
2. Verify token is validated (`GET /api/auth/password-reset/verify/{token}`)
3. Verify password form appears with strength indicator and requirements checklist
4. Enter a weak password — verify requirements checklist shows unmet criteria
5. Enter a strong password (8+ chars, uppercase, lowercase, number, special char)
6. Verify all requirements show as met (green checks)
7. Toggle show/hide password — verify visibility changes
8. Confirm password in second field
9. Submit — verify `POST /api/auth/password-reset/confirm` called
10. Verify success message
11. Navigate to login and sign in with the new password — verify access
12. Test with an expired/invalid token — verify error state (not the reset form)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Token verification happens before showing the form
- Invalid/expired tokens show error without exposing reset form
- Password strength indicator updates in real-time
- All requirements must be met before submission
- New password works immediately for login
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
Follows TC-PR-001 (request step). Together they cover the full forgot-password flow end-to-end.
<span style="display:none">{/traklet:section:notes}</span>
