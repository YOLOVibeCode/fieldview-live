---
id: TC-OA-002
title: Owner login shows error for bad password
priority: high
labels:
  - auth
  - owner
  - negative
suite: auth-owner
backend-id: "142"
last-synced: "2026-08-05T21:30:56.628Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Ensure invalid credentials do not create a session and the user sees a clear error.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Known-good email format; wrong password
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Go to `https://dev.fieldview.live/owners/login`
2. Enter a real account email with an incorrect password
3. Submit the form
4. Observe UI feedback (`role="alert"` or `data-testid="error-*"` if present)
5. Confirm URL is still login (or error state) and `https://dev.fieldview.live/owners/dashboard` is not reachable without fixing credentials
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Error message visible. No successful redirect to dashboard. Refreshing does not show authenticated dashboard.
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
Do not use production owner passwords in tickets; use disposable test accounts.
<span style="display:none">{/traklet:section:notes}</span>
