---
id: TC-PR-001
title: Password reset request sends email and allows setting new password
priority: high
labels:
  - account
  - auth
suite: account
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Forgot-password flow delivers reset link (or error if unknown email) and `/reset-password` completes with new credential.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Access to test mailbox OR mailpit in dev
- Disposable owner email that can be reset safely
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open `/forgot-password`
2. Submit owner email
3. Open reset link token from email (or capture from dev mail sink)
4. Set new password on `/reset-password`
5. Login with new password (**TC-OA-001** path)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Email arrives (rate limits respected). Token one-time use. Old password stops working.
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
Pair with Playwright `password-reset.spec.ts` for selector stability tickets.
{/traklet:section:notes}
