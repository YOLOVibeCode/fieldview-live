---
id: TC-PW-002
title: Successful purchase grants stream access
priority: critical
labels:
  - paywall
  - monetization
  - square
suite: paywall
backend-id: "180"
last-synced: "2026-08-05T21:31:41.133Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that completing a Square payment grants the viewer access to the stream.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Direct stream with paywall enabled
- Square sandbox credentials configured
- Test card numbers available (Square sandbox)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to a paywalled stream in incognito
2. PaywallModal appears — fill in viewer details
3. Enter Square sandbox test card (4532 7597 3454 5858)
4. Complete purchase
5. Observe stream page after payment succeeds
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Payment processes successfully. PaywallModal closes. Video player loads and playback begins. Purchase token is stored in localStorage for session persistence.
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
Square sandbox environment. Platform fee (10%) is applied server-side.
<span style="display:none">{/traklet:section:notes}</span>
