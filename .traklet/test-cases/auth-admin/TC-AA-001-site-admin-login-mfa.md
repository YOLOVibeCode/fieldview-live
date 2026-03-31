---
id: TC-AA-001
title: Site admin login and MFA to console
priority: critical
labels:
  - auth
  - admin
  - mfa
suite: auth-admin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify console admin can authenticate including MFA/TOTP step and reach the admin console. Distinct from **TC-AD-001** (direct-stream producer unlock on `/direct/...`).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Admin email, password, and current TOTP code (test account)
- MFA enrollment completed for that admin in target env
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/admin/login` (or current admin entry URL)
2. Submit primary credentials
3. When prompted, enter MFA code
4. Confirm arrival at console home (e.g. `/admin/console` or equivalent)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Successful console access. Invalid MFA rejected with retry. No partial session that leaks protected data.
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
Coordinate with DevOps for test admin rotation. Never paste live secrets into Traklet notes.
{/traklet:section:notes}
