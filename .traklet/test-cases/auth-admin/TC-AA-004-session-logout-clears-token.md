---
id: TC-AA-004
title: Admin logout clears session and redirects to login
priority: high
labels:
  - auth
  - admin
  - session
suite: auth-admin
backend-id: "136"
last-synced: "2026-08-05T21:30:49.722Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that clicking "Sign out" on any admin console page clears the session token from localStorage, emits a user update event, and redirects to `https://dev.fieldview.live/admin/login`.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated admin on console)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Authenticate and navigate to `https://dev.fieldview.live/admin/console`
2. Verify session token exists in localStorage
3. Click "Sign out" button (desktop text or mobile icon)
4. Verify redirect to `https://dev.fieldview.live/admin/login`
5. Verify session token is removed from localStorage
6. Attempt to navigate directly to `https://dev.fieldview.live/admin/console` via URL bar
7. Verify redirect back to `https://dev.fieldview.live/admin/login` (no stale session)
8. Repeat from `https://dev.fieldview.live/admin/revenue` and `https://dev.fieldview.live/admin/coupons` — confirm logout works from every page
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Sign out clears `adminSessionToken` from localStorage
- Immediate redirect to `https://dev.fieldview.live/admin/login`
- Subsequent direct navigation to protected pages redirects to login
- No flash of protected content before redirect
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
Sign out button renders as text on desktop and icon on mobile — test both breakpoints if feasible.
<span style="display:none">{/traklet:section:notes}</span>
