---
id: TC-CW-004
title: Watch-link checkout flow for paid streams
priority: critical
labels:
  - checkout
  - watch-links
  - monetization
suite: checkout
backend-id: "152"
last-synced: "2026-08-05T21:31:08.317Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the `https://dev.fieldview.live/watch/{org}/{team}` paid checkout flow — distinct from the game checkout — collects viewer info, shows price, and proceeds to Square payment.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- A watch link channel with `accessMode: 'pay_per_view'` and a price set
- Square sandbox configured
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/watch/{org}/{team}` for a paid channel
2. Verify paywall view shows: price display, email/phone form, optional reminder checkbox
3. Verify calendar integration buttons (Google, Outlook, iCal) if stream is scheduled
4. Enter email and phone number
5. Click checkout/proceed button
6. Verify `POST /api/public/watch-links/{org}/{team}/checkout` is called
7. Verify redirect to Square payment page
8. Complete payment (sandbox)
9. Verify return to success page and stream access granted
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Watch link bootstrap fetched from `GET /api/public/watch-links/{org}/{team}`
- Paywall displayed for `pay_per_view` channels
- Checkout creates purchase via channel-specific endpoint (not game endpoint)
- Square payment flow completes and grants stream access
- Free channels (`public_free`) skip paywall entirely
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
Distinct from TC-CW-002 (game checkout). This tests the watch-link-specific checkout path.
<span style="display:none">{/traklet:section:notes}</span>
