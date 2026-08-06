---
id: TC-OA-001
title: Owner login with valid credentials reaches dashboard
priority: critical
labels:
  - auth
  - owner
  - smoke
suite: auth-owner
backend-id: "141"
last-synced: "2026-08-05T21:30:55.510Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify an owner can sign in and land on the dashboard with an active session.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Test owner email and password (secure channel / `.env.test`)
- Owner account exists in target environment
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/owners/login`
2. Fill email (`data-testid="input-email"` if present, else labeled email field)
3. Fill password (`data-testid="input-password"`)
4. Submit (`data-testid="btn-submit-login"` or submit button)
5. Wait for navigation
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Redirect to `https://dev.fieldview.live/owners/dashboard` (or current canonical dashboard path). No persistent auth error. Dashboard content loads.
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
Pair with TC-OA-002 for negative path. Align credentials with Playwright `owner-login.spec.ts` fixtures if available.
<span style="display:none">{/traklet:section:notes}</span>
