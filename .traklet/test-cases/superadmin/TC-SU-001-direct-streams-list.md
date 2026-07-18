---
id: TC-SU-001
title: Superadmin direct streams inventory loads
priority: medium
labels:
  - superadmin
  - direct-stream
suite: superadmin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Users with superadmin role can open direct stream management (`/superadmin/direct-streams` or current) and list/search without error.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Superadmin credentials (least privilege test account)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Authenticate as superadmin
2. Open direct streams admin view
3. Scroll / search if UI supports it
4. Open one row detail or edit if available (non-destructive)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Table renders; CRUD controls respect RBAC; dangerous actions behind confirmation.
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
Production edits only with change window + owner approval.
{/traklet:section:notes}
