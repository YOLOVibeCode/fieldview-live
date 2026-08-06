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
backend-id: "138"
last-synced: "2026-08-05T21:30:52.117Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that a user with `support_admin` role cannot access superadmin-only functionality — specifically the DirectStreams console and destructive coupon/seed operations.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- A test account with `role: 'support_admin'` and `status: 'active'`
- Authenticated session for that account
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Login as support_admin via `https://dev.fieldview.live/admin/login`
2. Verify successful login and redirect to `https://dev.fieldview.live/admin/console`
3. Verify console search, purchase timeline, and audience pages work normally
4. Navigate to `https://dev.fieldview.live/superadmin/direct-streams`
5. Verify access is denied (401/403 or redirect) — no stream data visible
6. Attempt API call: `GET /api/admin/direct-streams` with support_admin session token
7. Verify 401 response ("SuperAdmin access required")
8. Attempt API call: `POST /api/admin/coupons` (create coupon)
9. Verify 403 response
10. Verify admin console navigation does NOT show a link to superadmin streams (if nav exists)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Support admin can access: console search, purchases, audience, revenue, coupon list
- Support admin is denied: DirectStreams CRUD, coupon create/update/delete, seed endpoints, impersonation
- API returns 401 "SuperAdmin access required" for all `requireSuperAdmin` endpoints
- UI does not expose links to pages the role cannot access
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
Requires a support_admin test account. Create via direct DB insert or admin setup tooling if one does not exist.
<span style="display:none">{/traklet:section:notes}</span>
