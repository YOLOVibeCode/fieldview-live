---
id: TC-QR-001
title: QR or deep link opens correct checkout or watch context
priority: medium
labels:
  - checkout
  - qr
suite: checkout
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Marketing QR codes or mobile deep links land on the intended game/checkout with prefilled context (game title visible, correct `purchaseId` or slug).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Sample QR image or raw URL from generator (`/checkout/...`, `/game/...`, or watch URL with UTM)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Scan QR with phone or paste target URL in desktop browser
2. Confirm landing page matches printed material (team names, price)
3. Continue one harmless step (scroll, start checkout) without completing payment unless approved
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
No wrong-game mixups; 404 if slug typo in print — document support macro.
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
Especially validate before large on-field print runs.
{/traklet:section:notes}
