---
id: TC-AD-001
title: Admin panel unlock with owner password
priority: critical
labels:
  - admin
  - auth
  - smoke
suite: admin
backend-id: "131"
last-synced: "2026-08-05T21:30:43.830Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that the admin panel can be unlocked with the correct owner password and grants both admin JWT and viewer JWT.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Direct stream with an owner password set
- Known owner password
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/direct/[slug]`
2. Enter the owner password in the admin unlock form
3. Submit the form
4. Observe the admin panel state
5. Verify viewer identity is auto-connected (check chat panel)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Admin panel unlocks and displays producer controls (score editing, clock controls, stream settings). Admin JWT is stored. Viewer JWT is also returned — viewer auto-logged in for chat.
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
Admin unlock returns both admin JWT + viewer JWT for auto-login via `setExternalIdentity`.
<span style="display:none">{/traklet:section:notes}</span>
