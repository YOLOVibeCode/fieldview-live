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
backend-id: "193"
last-synced: "2026-08-05T21:31:56.412Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify a superadmin can impersonate a stream's admin by clicking the Impersonate button, which generates a 1-hour JWT, stores it in localStorage, and opens the stream page in a new tab with admin access.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-AA-001 session (authenticated superadmin)
- At least one active DirectStream in the table
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/superadmin/direct-streams`
2. Locate an active stream row
3. Click "Impersonate Admin" button (`btn-impersonate-{slug}`)
4. Verify API call: `POST /api/admin/direct-streams/{slug}/impersonate` returns 200
5. Verify `admin_token_{slug}` is set in localStorage
6. Verify a new tab opens to `https://dev.fieldview.live/direct/[slug]`
7. In the new tab, confirm admin panel is unlocked (producer controls visible without needing to enter password)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Impersonate button triggers JWT generation
- localStorage contains valid admin token for that slug
- New tab loads stream page with admin privileges active
- Token expires after 1 hour (verify via JWT decode if possible)
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
Impersonation tokens are short-lived (1h). Verify token expiration does not leave stale admin access. Error toast should appear if the stream is not active or slug is invalid.
<span style="display:none">{/traklet:section:notes}</span>
