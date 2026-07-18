---
id: TC-AA-005
title: Unauthenticated access to admin pages redirects to login
priority: critical
labels:
  - auth
  - admin
  - security
suite: auth-admin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that all protected admin pages redirect unauthenticated users to `/admin/login` without leaking any admin data or rendering protected content.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- No admin session token in localStorage (use incognito or clear storage)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Clear localStorage (or open incognito window)
2. Navigate directly to `/admin/console`
3. Verify redirect to `/admin/login`
4. Navigate directly to `/admin/revenue`
5. Verify redirect to `/admin/login`
6. Navigate directly to `/admin/coupons`
7. Verify redirect to `/admin/login`
8. Navigate directly to `/admin/purchases/some-id`
9. Verify redirect to `/admin/login`
10. Navigate directly to `/superadmin/direct-streams`
11. Verify redirect to `/admin/login` or access denied
12. Verify no API calls succeed without a session token (check network tab for 401s)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- All protected routes redirect to `/admin/login` when no session token present
- No protected data visible during redirect (no flash of content)
- API endpoints return 401 without valid session token
- `/superadmin/direct-streams` is also protected
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
Critical security test. Also verify with an expired/malformed token — should behave identically to no token.
{/traklet:section:notes}
