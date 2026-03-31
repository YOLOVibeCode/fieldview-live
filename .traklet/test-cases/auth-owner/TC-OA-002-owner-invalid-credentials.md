---
id: TC-OA-002
title: Owner login shows error for bad password
priority: high
labels:
  - auth
  - owner
  - negative
suite: auth-owner
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Ensure invalid credentials do not create a session and the user sees a clear error.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Known-good email format; wrong password
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Go to `/owners/login`
2. Enter a real account email with an incorrect password
3. Submit the form
4. Observe UI feedback (`role="alert"` or `data-testid="error-*"` if present)
5. Confirm URL is still login (or error state) and `/owners/dashboard` is not reachable without fixing credentials
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Error message visible. No successful redirect to dashboard. Refreshing does not show authenticated dashboard.
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
Do not use production owner passwords in tickets; use disposable test accounts.
{/traklet:section:notes}
