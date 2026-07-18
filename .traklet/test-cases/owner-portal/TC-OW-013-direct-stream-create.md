---
id: TC-OW-013
title: Owner creates a new direct stream
priority: high
labels:
  - owner
  - direct-stream
  - create
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify an owner can create a new direct stream using the inline create form on the direct streams page.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-OA-001 session (authenticated owner)
- No existing stream with the test slug
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. On `/owners/direct-streams`, click "+ Create Direct Stream"
2. Verify inline create form appears with fields: slug, title, admin password, stream URL
3. Fill in slug (lowercase, hyphens only), title, admin password (8+ chars)
4. Optionally add a stream URL
5. Click "Create Stream"
6. Verify `POST /api/owners/direct-streams` is called
7. Verify form closes and new stream appears in the table
8. Verify stream count increments
9. Test with invalid slug (uppercase, spaces) — verify validation error
10. Test with short password (<8 chars) — verify button stays disabled
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Create form validates slug format and password length
- Successful creation adds new row to table without page reload
- Form resets after successful creation
- Error toast shown if slug already exists (409)
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
Slug is auto-lowercased on submit. Admin password is hashed server-side.
{/traklet:section:notes}
