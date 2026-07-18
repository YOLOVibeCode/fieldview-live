---
id: TC-AD-001
title: Admin panel unlock with owner password
priority: critical
labels:
  - admin
  - auth
  - smoke
suite: admin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that the admin panel can be unlocked with the correct owner password and grants both admin JWT and viewer JWT.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Direct stream with an owner password set
- Known owner password
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to a direct stream page
2. Enter the owner password in the admin unlock form
3. Submit the form
4. Observe the admin panel state
5. Verify viewer identity is auto-connected (check chat panel)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Admin panel unlocks and displays producer controls (score editing, clock controls, stream settings). Admin JWT is stored. Viewer JWT is also returned — viewer auto-logged in for chat.
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
Admin unlock returns both admin JWT + viewer JWT for auto-login via `setExternalIdentity`.
{/traklet:section:notes}
