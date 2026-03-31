---
id: TC-CW-004
title: Watch-link checkout flow for paid streams
priority: critical
labels:
  - checkout
  - watch-links
  - monetization
suite: checkout
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the `/watch/{org}/{team}` paid checkout flow — distinct from the game checkout — collects viewer info, shows price, and proceeds to Square payment.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- A watch link channel with `accessMode: 'pay_per_view'` and a price set
- Square sandbox configured
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/watch/{org}/{team}` for a paid channel
2. Verify paywall view shows: price display, email/phone form, optional reminder checkbox
3. Verify calendar integration buttons (Google, Outlook, iCal) if stream is scheduled
4. Enter email and phone number
5. Click checkout/proceed button
6. Verify `POST /api/public/watch-links/{org}/{team}/checkout` is called
7. Verify redirect to Square payment page
8. Complete payment (sandbox)
9. Verify return to success page and stream access granted
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Watch link bootstrap fetched from `GET /api/public/watch-links/{org}/{team}`
- Paywall displayed for `pay_per_view` channels
- Checkout creates purchase via channel-specific endpoint (not game endpoint)
- Square payment flow completes and grants stream access
- Free channels (`public_free`) skip paywall entirely
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
Distinct from TC-CW-002 (game checkout). This tests the watch-link-specific checkout path.
{/traklet:section:notes}
