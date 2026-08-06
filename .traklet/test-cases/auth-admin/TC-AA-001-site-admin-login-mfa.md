---
id: TC-AA-001
title: Site admin login and MFA to console
priority: critical
labels:
  - auth
  - admin
  - mfa
suite: auth-admin
backend-id: "133"
last-synced: "2026-08-05T21:30:46.233Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify console admin can authenticate including MFA/TOTP step and reach the admin console. Distinct from **TC-AD-001** (direct-stream producer unlock on `https://dev.fieldview.live/direct/...`).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Admin email, password, and current TOTP code (test account)
- MFA enrollment completed for that admin in target env
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/admin/login` (or current admin entry URL)
2. Submit primary credentials
3. When prompted, enter MFA code
4. Confirm arrival at console home (e.g. `https://dev.fieldview.live/admin/console` or equivalent)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Successful console access. Invalid MFA rejected with retry. No partial session that leaks protected data.
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
Coordinate with DevOps for test admin rotation. Never paste live secrets into Traklet notes.
<span style="display:none">{/traklet:section:notes}</span>
