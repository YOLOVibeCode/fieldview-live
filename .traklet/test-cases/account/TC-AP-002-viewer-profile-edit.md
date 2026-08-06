---
id: TC-AP-002
title: Viewer edits profile name on account page
priority: high
labels:
  - account
  - viewer
  - update
suite: account
backend-id: "115"
last-synced: "2026-08-05T21:30:24.827Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify an authenticated viewer can edit their first/last name on the `https://dev.fieldview.live/account` page, and that guest accounts have profile editing disabled.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Authenticated viewer identity (registered, not guest)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/account`
2. Verify profile section shows current name and email
3. Edit first name and last name fields
4. Click save — verify `PATCH /api/public/viewer/{id}` is called
5. Verify success feedback (updated values persist)
6. Refresh page — verify new name persists
7. Test as guest account — verify profile fields are disabled
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Profile PATCH sends updated name fields
- Name changes persist across page reloads
- Guest accounts show disabled input fields
- Email is displayed but not editable
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
Extends TC-AP-001 (page loads). Guest detection uses synthetic email pattern (`anon-*@guest.fieldview.live`).
<span style="display:none">{/traklet:section:notes}</span>
