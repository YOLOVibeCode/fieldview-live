---
id: TC-AP-002
title: Viewer edits profile name on account page
priority: high
labels:
  - account
  - viewer
  - update
suite: account
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify an authenticated viewer can edit their first/last name on the `/account` page, and that guest accounts have profile editing disabled.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Authenticated viewer identity (registered, not guest)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/account`
2. Verify profile section shows current name and email
3. Edit first name and last name fields
4. Click save — verify `PATCH /api/public/viewer/{id}` is called
5. Verify success feedback (updated values persist)
6. Refresh page — verify new name persists
7. Test as guest account — verify profile fields are disabled
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Profile PATCH sends updated name fields
- Name changes persist across page reloads
- Guest accounts show disabled input fields
- Email is displayed but not editable
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
Extends TC-AP-001 (page loads). Guest detection uses synthetic email pattern (`anon-*@guest.fieldview.live`).
{/traklet:section:notes}
