---
id: TC-OA-003
title: Owner logout clears session
priority: high
labels:
  - auth
  - owner
suite: auth-owner
---

{traklet:test-case}

{traklet:section:objective}
## Objective
After logout, protected owner routes require sign-in again.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Logged-in owner session (complete TC-OA-001 first)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. From dashboard, use Sign out / Logout (note `data-testid` if assigned)
2. Confirm redirect to login or public page
3. Manually navigate to `/owners/dashboard`
4. Expect redirect to login or unauthorized state
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Session cleared; dashboard not accessible until re-authentication.
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
If logout control lacks `data-testid`, file a follow-up for automation parity.
{/traklet:section:notes}
