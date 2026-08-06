---
id: TC-WP-001
title: Pay-per-view watch link shows checkout before playback
priority: critical
labels:
  - watch-links
  - paywall
suite: watch-links
backend-id: "206"
last-synced: "2026-08-05T21:32:11.287Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Paid watch channel surfaces price and purchase path before revealing the player to unpaid visitors.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Channel with `accessMode: pay_per_view` and price configured
- Fresh session (no prior purchase cookie/token)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/watch/{org}/{team}` incognito
2. Verify checkout or paywall UI visible with correct price display
3. Confirm video is not fully accessible until purchase path completes (align with **TC-PW-001** for direct streams)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Monetization gate works on stable link. Price matches admin configuration.
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
After purchase, expect same URL to show player — pair with **TC-CW-003** if testing full pay.
<span style="display:none">{/traklet:section:notes}</span>
