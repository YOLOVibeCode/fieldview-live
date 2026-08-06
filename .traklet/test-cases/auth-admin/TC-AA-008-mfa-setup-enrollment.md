---
id: TC-AA-008
title: Admin MFA setup and enrollment
priority: high
labels:
  - auth
  - admin
  - mfa
suite: auth-admin
backend-id: "140"
last-synced: "2026-08-05T21:30:54.378Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the `https://dev.fieldview.live/admin/mfa` page allows an admin to enable MFA by generating a TOTP secret, scanning a QR code, and verifying a 6-digit token.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated admin without MFA currently enabled)
- TOTP authenticator app available (Google Authenticator, Authy, etc.)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/admin/mfa`
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
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Setup calls `POST /api/admin/mfa/setup` returning secret + QR URL
- QR code renders as image (data URL or hosted)
- Manual secret displayed for copy
- Verify calls `POST /api/admin/mfa/verify` with 6-digit token
- On success, MFA is permanently enabled for the account
- Subsequent logins require MFA token
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
Use a dedicated test admin account for MFA enrollment. Once enabled, MFA cannot be disabled from this UI.
<span style="display:none">{/traklet:section:notes}</span>
