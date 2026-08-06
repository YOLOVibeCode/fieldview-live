---
id: TC-OW-004
title: New owner can self-register and reach login or onboarding
priority: medium
labels:
  - owner
  - registration
suite: owner-portal
backend-id: "167"
last-synced: "2026-08-05T21:31:26.141Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
`https://dev.fieldview.live/owners/register` completes account creation (or applies invite token) and user can sign in afterward.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Disposable email for signup
- Environment allows open registration (disable test if invite-only)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/owners/register` and fill the registration form
2. Fill required fields; submit
3. Complete email verification if required
4. Log in via **TC-OA-001** path with new credentials
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Account created; duplicate email rejected with clear message.
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
Delete test accounts per data retention policy.
<span style="display:none">{/traklet:section:notes}</span>
