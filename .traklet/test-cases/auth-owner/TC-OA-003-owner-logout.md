---
id: TC-OA-003
title: Owner logout clears session
priority: high
labels:
  - auth
  - owner
suite: auth-owner
backend-id: "143"
last-synced: "2026-08-05T21:30:57.734Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
After logout, protected owner routes require sign-in again.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Logged-in owner session (complete TC-OA-001 first)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. From dashboard, use Sign out / Logout (note `data-testid` if assigned)
2. Confirm redirect to login or public page
3. Manually navigate to `https://dev.fieldview.live/owners/dashboard`
4. Expect redirect to login or unauthorized state
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Session cleared; dashboard not accessible until re-authentication.
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
If logout control lacks `data-testid`, file a follow-up for automation parity.
<span style="display:none">{/traklet:section:notes}</span>
