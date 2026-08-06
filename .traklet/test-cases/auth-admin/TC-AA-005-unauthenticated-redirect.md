---
id: TC-AA-005
title: Unauthenticated access to admin pages redirects to login
priority: critical
labels:
  - auth
  - admin
  - security
suite: auth-admin
backend-id: "137"
last-synced: "2026-08-05T21:30:50.912Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that all protected admin pages redirect unauthenticated users to `https://dev.fieldview.live/admin/login` without leaking any admin data or rendering protected content.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- No admin session token in localStorage (use incognito or clear storage)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Clear localStorage (or open incognito window)
2. Navigate directly to `https://dev.fieldview.live/admin/console`
3. Verify redirect to `https://dev.fieldview.live/admin/login`
4. Navigate directly to `https://dev.fieldview.live/admin/revenue`
5. Verify redirect to `https://dev.fieldview.live/admin/login`
6. Navigate directly to `https://dev.fieldview.live/admin/coupons`
7. Verify redirect to `https://dev.fieldview.live/admin/login`
8. Navigate directly to `https://dev.fieldview.live/admin/purchases/some-id`
9. Verify redirect to `https://dev.fieldview.live/admin/login`
10. Navigate directly to `https://dev.fieldview.live/superadmin/direct-streams`
11. Verify redirect to `https://dev.fieldview.live/admin/login` or access denied
12. Verify no API calls succeed without a session token (check network tab for 401s)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- All protected routes redirect to `https://dev.fieldview.live/admin/login` when no session token present
- No protected data visible during redirect (no flash of content)
- API endpoints return 401 without valid session token
- `https://dev.fieldview.live/superadmin/direct-streams` is also protected
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
Critical security test. Also verify with an expired/malformed token — should behave identically to no token.
<span style="display:none">{/traklet:section:notes}</span>
