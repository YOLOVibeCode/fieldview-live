---
id: TC-OW-008
title: Owner Square Connect onboarding and status
priority: critical
labels:
  - owner
  - square
  - payments
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the `/owners/square` page shows Square connection status, allows connecting via OAuth, and handles the post-callback success state.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-OA-001 session (authenticated owner)
- Square sandbox credentials configured in environment
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/owners/square`
2. If not connected: verify "Connect Square" card with explanation and button
3. Click "Connect Square" — verify redirect to Square OAuth page
4. Complete Square OAuth (sandbox) — verify redirect back to `/owners/square?square_connected=true`
5. Verify green success banner appears
6. Verify status card shows: merchantId, location ID status, token expiry
7. Refresh page — verify status persists (no success banner, but connected state remains)
8. If token expired: verify amber "Reconnection Needed" card with "Reconnect" button
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Status fetched from `GET /api/owners/me/square/status`
- Connect button POSTs to `/api/owners/square/connect` with returnUrl
- OAuth callback redirects back with `?square_connected=true` query param
- Three UI states: not connected, connected, needs reconnect
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
Square OAuth requires sandbox credentials. Full round-trip may only be testable in staging/sandbox environments.
{/traklet:section:notes}
