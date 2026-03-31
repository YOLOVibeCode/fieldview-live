---
id: TC-AA-008
title: Admin MFA setup and enrollment
priority: high
labels:
  - auth
  - admin
  - mfa
suite: auth-admin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the `/admin/mfa` page allows an admin to enable MFA by generating a TOTP secret, scanning a QR code, and verifying a 6-digit token.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated admin without MFA currently enabled)
- TOTP authenticator app available (Google Authenticator, Authy, etc.)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/admin/mfa`
2. Verify Step 1: "Enable MFA" card with setup button
3. Click "Set Up MFA" — verify QR code image and manual secret appear (Step 2)
4. Scan QR code with authenticator app (or use manual secret)
5. Enter the 6-digit token from authenticator
6. Click "Verify & Enable MFA"
7. Verify Step 3: success card "MFA Enabled" with green styling
8. Click "Return to Console" — verify navigation
9. Logout and login again — verify MFA token is now required
10. Enter wrong MFA token — verify error and retry
11. Enter correct MFA token — verify access granted
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Setup calls `POST /api/admin/mfa/setup` returning secret + QR URL
- QR code renders as image (data URL or hosted)
- Manual secret displayed for copy
- Verify calls `POST /api/admin/mfa/verify` with 6-digit token
- On success, MFA is permanently enabled for the account
- Subsequent logins require MFA token
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
Use a dedicated test admin account for MFA enrollment. Once enabled, MFA cannot be disabled from this UI.
{/traklet:section:notes}
