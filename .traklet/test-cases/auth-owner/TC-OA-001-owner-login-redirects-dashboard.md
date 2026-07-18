---
id: TC-OA-001
title: Owner login with valid credentials reaches dashboard
priority: critical
labels:
  - auth
  - owner
  - smoke
suite: auth-owner
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify an owner can sign in and land on the dashboard with an active session.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Test owner email and password (secure channel / `.env.test`)
- Owner account exists in target environment
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/owners/login`
2. Fill email (`data-testid="input-email"` if present, else labeled email field)
3. Fill password (`data-testid="input-password"`)
4. Submit (`data-testid="btn-submit-login"` or submit button)
5. Wait for navigation
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Redirect to `/owners/dashboard` (or current canonical dashboard path). No persistent auth error. Dashboard content loads.
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
Pair with TC-OA-002 for negative path. Align credentials with Playwright `owner-login.spec.ts` fixtures if available.
{/traklet:section:notes}
