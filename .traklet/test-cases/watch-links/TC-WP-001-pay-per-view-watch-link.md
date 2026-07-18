---
id: TC-WP-001
title: Pay-per-view watch link shows checkout before playback
priority: critical
labels:
  - watch-links
  - paywall
suite: watch-links
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Paid watch channel surfaces price and purchase path before revealing the player to unpaid visitors.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Channel with `accessMode: pay_per_view` and price configured
- Fresh session (no prior purchase cookie/token)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open `/watch/{org}/{team}` incognito
2. Verify checkout or paywall UI visible with correct price display
3. Confirm video is not fully accessible until purchase path completes (align with **TC-PW-001** for direct streams)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Monetization gate works on stable link. Price matches admin configuration.
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
After purchase, expect same URL to show player — pair with **TC-CW-003** if testing full pay.
{/traklet:section:notes}
