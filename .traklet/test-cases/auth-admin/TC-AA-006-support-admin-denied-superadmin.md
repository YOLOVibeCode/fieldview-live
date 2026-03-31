---
id: TC-AA-006
title: Support admin denied access to superadmin-only pages
priority: critical
labels:
  - auth
  - admin
  - rbac
  - security
suite: auth-admin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that a user with `support_admin` role cannot access superadmin-only functionality — specifically the DirectStreams console and destructive coupon/seed operations.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- A test account with `role: 'support_admin'` and `status: 'active'`
- Authenticated session for that account
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Login as support_admin via `/admin/login`
2. Verify successful login and redirect to `/admin/console`
3. Verify console search, purchase timeline, and audience pages work normally
4. Navigate to `/superadmin/direct-streams`
5. Verify access is denied (401/403 or redirect) — no stream data visible
6. Attempt API call: `GET /api/admin/direct-streams` with support_admin session token
7. Verify 401 response ("SuperAdmin access required")
8. Attempt API call: `POST /api/admin/coupons` (create coupon)
9. Verify 403 response
10. Verify admin console navigation does NOT show a link to superadmin streams (if nav exists)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Support admin can access: console search, purchases, audience, revenue, coupon list
- Support admin is denied: DirectStreams CRUD, coupon create/update/delete, seed endpoints, impersonation
- API returns 401 "SuperAdmin access required" for all `requireSuperAdmin` endpoints
- UI does not expose links to pages the role cannot access
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
Requires a support_admin test account. Create via direct DB insert or admin setup tooling if one does not exist.
{/traklet:section:notes}
