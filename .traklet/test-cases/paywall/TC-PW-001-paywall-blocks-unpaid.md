---
id: TC-PW-001
title: Paywall blocks access for unpaid viewers
priority: critical
labels:
  - paywall
  - smoke
  - monetization
suite: paywall
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that the paywall modal appears and blocks stream access for viewers who have not purchased access.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Direct stream with paywall enabled (non-zero price)
- Fresh browser session (no localStorage purchase token)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open a new incognito/private window
2. Navigate to `/direct/<slug>` for a paywalled stream
3. Observe the PaywallModal
4. Attempt to dismiss the modal without purchasing
5. Verify video content is not accessible
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
PaywallModal renders with stream price and purchase form. Video player is hidden or blurred behind the modal. Modal cannot be dismissed without valid purchase or access code.
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
Flow: localStorage check -> server verify -> grant/deny. Square Web Payments SDK handles checkout.
{/traklet:section:notes}
