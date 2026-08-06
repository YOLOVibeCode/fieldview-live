---
id: TC-QR-001
title: QR or deep link opens correct checkout or watch context
priority: medium
labels:
  - checkout
  - qr
suite: checkout
backend-id: "155"
last-synced: "2026-08-05T21:31:11.818Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Marketing QR codes or mobile deep links land on the intended game/checkout with prefilled context (game title visible, correct `purchaseId` or slug).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Sample QR image or raw URL from generator (`https://dev.fieldview.live/checkout/...`, `https://dev.fieldview.live/game/...`, or watch URL with UTM)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Scan QR with phone or paste target URL in desktop browser
2. Confirm landing page matches printed material (team names, price)
3. Continue one harmless step (scroll, start checkout) without completing payment unless approved
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
No wrong-game mixups; 404 if slug typo in print — document support macro.
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
Especially validate before large on-field print runs.
<span style="display:none">{/traklet:section:notes}</span>
