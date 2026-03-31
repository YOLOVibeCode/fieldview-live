---
id: TC-AP-001
title: Viewer account page loads for signed-in user
priority: low
labels:
  - account
  - viewer
suite: account
---

{traklet:test-case}

{traklet:section:objective}
## Objective
`/account` shows purchases, profile, or entitlement summary when a viewer/owner session is present; handles anonymous state per design.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Session with known purchase OR anonymous browser (both if two passes needed)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. While logged in (any relevant viewer identity), open `/account`
2. Verify list of accessible games/purchases or empty state
3. Optional: anonymous user hits `/account` — redirect to login or marketing message?
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
No 500; PII only for current user; sign-out link works if shown.
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
Low frequency regression; run after auth changes.
{/traklet:section:notes}
