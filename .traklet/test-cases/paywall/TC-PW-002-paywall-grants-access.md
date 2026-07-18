---
id: TC-PW-002
title: Successful purchase grants stream access
priority: critical
labels:
  - paywall
  - monetization
  - square
suite: paywall
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that completing a Square payment grants the viewer access to the stream.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Direct stream with paywall enabled
- Square sandbox credentials configured
- Test card numbers available (Square sandbox)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to a paywalled stream in incognito
2. PaywallModal appears — fill in viewer details
3. Enter Square sandbox test card (4532 7597 3454 5858)
4. Complete purchase
5. Observe stream page after payment succeeds
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Payment processes successfully. PaywallModal closes. Video player loads and playback begins. Purchase token is stored in localStorage for session persistence.
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
Square sandbox environment. Platform fee (10%) is applied server-side.
{/traklet:section:notes}
