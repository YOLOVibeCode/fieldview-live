---
id: TC-PR-001
title: Password reset request sends email and allows setting new password
priority: high
labels:
  - account
  - auth
suite: account
backend-id: "118"
last-synced: "2026-08-05T21:30:28.390Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Forgot-password flow delivers reset link (or error if unknown email) and `https://dev.fieldview.live/reset-password` completes with new credential.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Access to test mailbox OR mailpit in dev
- Disposable owner email that can be reset safely
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/forgot-password`
2. Submit owner email
3. Open reset link token from email (or capture from dev mail sink)
4. Set new password on `https://dev.fieldview.live/reset-password`
5. Login with new password (**TC-OA-001** path)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Email arrives (rate limits respected). Token one-time use. Old password stops working.
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
Pair with Playwright `password-reset.spec.ts` for selector stability tickets.
<span style="display:none">{/traklet:section:notes}</span>
