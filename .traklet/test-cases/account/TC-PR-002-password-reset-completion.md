---
id: TC-PR-002
title: Password reset completion with new password
priority: high
labels:
  - account
  - auth
  - password
suite: account
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the `/reset-password` page validates the reset token, enforces password strength requirements, and allows setting a new password that works for subsequent login.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-PR-001 completed (reset email received with token link)
- Valid reset token URL
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Click the reset link from the email (navigates to `/reset-password?token=...`)
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
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Token verification happens before showing the form
- Invalid/expired tokens show error without exposing reset form
- Password strength indicator updates in real-time
- All requirements must be met before submission
- New password works immediately for login
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
Follows TC-PR-001 (request step). Together they cover the full forgot-password flow end-to-end.
{/traklet:section:notes}
