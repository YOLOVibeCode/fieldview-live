---
id: TC-SU-004
title: Impersonate stream admin from superadmin console
priority: high
labels:
  - superadmin
  - direct-stream
  - impersonation
  - security
suite: superadmin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify a superadmin can impersonate a stream's admin by clicking the Impersonate button, which generates a 1-hour JWT, stores it in localStorage, and opens the stream page in a new tab with admin access.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one active DirectStream in the table
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/superadmin/direct-streams`
2. Locate an active stream row
3. Click "Impersonate Admin" button (`btn-impersonate-{slug}`)
4. Verify API call: `POST /api/admin/direct-streams/{slug}/impersonate` returns 200
5. Verify `admin_token_{slug}` is set in localStorage
6. Verify a new tab opens to `/{slug}`
7. In the new tab, confirm admin panel is unlocked (producer controls visible without needing to enter password)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Impersonate button triggers JWT generation
- localStorage contains valid admin token for that slug
- New tab loads stream page with admin privileges active
- Token expires after 1 hour (verify via JWT decode if possible)
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
Impersonation tokens are short-lived (1h). Verify token expiration does not leave stale admin access. Error toast should appear if the stream is not active or slug is invalid.
{/traklet:section:notes}
