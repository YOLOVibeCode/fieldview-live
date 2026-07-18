---
id: TC-OW-004
title: New owner can self-register and reach login or onboarding
priority: medium
labels:
  - owner
  - registration
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
`/owners/register` completes account creation (or applies invite token) and user can sign in afterward.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Disposable email for signup
- Environment allows open registration (disable test if invite-only)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open registration form
2. Fill required fields; submit
3. Complete email verification if required
4. Log in via **TC-OA-001** path with new credentials
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Account created; duplicate email rejected with clear message.
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
Delete test accounts per data retention policy.
{/traklet:section:notes}
