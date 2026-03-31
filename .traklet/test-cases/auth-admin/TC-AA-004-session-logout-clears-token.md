---
id: TC-AA-004
title: Admin logout clears session and redirects to login
priority: high
labels:
  - auth
  - admin
  - session
suite: auth-admin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that clicking "Sign out" on any admin console page clears the session token from localStorage, emits a user update event, and redirects to `/admin/login`.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated admin on console)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Authenticate and navigate to `/admin/console`
2. Verify session token exists in localStorage
3. Click "Sign out" button (desktop text or mobile icon)
4. Verify redirect to `/admin/login`
5. Verify session token is removed from localStorage
6. Attempt to navigate directly to `/admin/console` via URL bar
7. Verify redirect back to `/admin/login` (no stale session)
8. Repeat from `/admin/revenue` and `/admin/coupons` — confirm logout works from every page
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Sign out clears `adminSessionToken` from localStorage
- Immediate redirect to `/admin/login`
- Subsequent direct navigation to protected pages redirects to login
- No flash of protected content before redirect
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
Sign out button renders as text on desktop and icon on mobile — test both breakpoints if feasible.
{/traklet:section:notes}
