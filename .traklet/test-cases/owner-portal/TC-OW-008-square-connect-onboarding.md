---
id: TC-OW-008
title: Owner Square Connect onboarding and status
priority: critical
labels:
  - owner
  - square
  - payments
suite: owner-portal
backend-id: "171"
last-synced: "2026-08-05T21:31:30.771Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the `https://dev.fieldview.live/owners/square` page shows Square connection status, allows connecting via OAuth, and handles the post-callback success state.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-OA-001 session (authenticated owner)
- Square sandbox credentials configured in environment
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/owners/square`
2. If not connected: verify "Connect Square" card with explanation and button
3. Click "Connect Square" — verify redirect to Square OAuth page
4. Complete Square OAuth (sandbox) — verify redirect back to `https://dev.fieldview.live/owners/square?square_connected=true`
5. Verify green success banner appears
6. Verify status card shows: merchantId, location ID status, token expiry
7. Refresh page — verify status persists (no success banner, but connected state remains)
8. If token expired: verify amber "Reconnection Needed" card with "Reconnect" button
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Status fetched from `GET /api/owners/me/square/status`
- Connect button POSTs to `/api/owners/square/connect` with returnUrl
- OAuth callback redirects back with `?square_connected=true` query param
- Three UI states: not connected, connected, needs reconnect
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
Square OAuth requires sandbox credentials. Full round-trip may only be testable in staging/sandbox environments.
<span style="display:none">{/traklet:section:notes}</span>
