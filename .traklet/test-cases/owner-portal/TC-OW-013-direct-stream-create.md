---
id: TC-OW-013
title: Owner creates a new direct stream
priority: high
labels:
  - owner
  - direct-stream
  - create
suite: owner-portal
backend-id: "176"
last-synced: "2026-08-05T21:31:36.537Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify an owner can create a new direct stream using the inline create form on the direct streams page.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-OA-001 session (authenticated owner)
- No existing stream with the test slug
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. On `https://dev.fieldview.live/owners/direct-streams`, click "+ Create Direct Stream"
2. Verify inline create form appears with fields: slug, title, admin password, stream URL
3. Fill in slug (lowercase, hyphens only), title, admin password (8+ chars)
4. Optionally add a stream URL
5. Click "Create Stream"
6. Verify `POST /api/owners/direct-streams` is called
7. Verify form closes and new stream appears in the table
8. Verify stream count increments
9. Test with invalid slug (uppercase, spaces) — verify validation error
10. Test with short password (<8 chars) — verify button stays disabled
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Create form validates slug format and password length
- Successful creation adds new row to table without page reload
- Form resets after successful creation
- Error toast shown if slug already exists (409)
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
Slug is auto-lowercased on submit. Admin password is hashed server-side.
<span style="display:none">{/traklet:section:notes}</span>
