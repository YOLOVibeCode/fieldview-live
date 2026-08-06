---
id: TC-PW-001
title: Paywall blocks access for unpaid viewers
priority: critical
labels:
  - paywall
  - smoke
  - monetization
suite: paywall
backend-id: "179"
last-synced: "2026-08-05T21:31:39.994Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that the paywall modal appears and blocks stream access for viewers who have not purchased access.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Direct stream with paywall enabled (non-zero price)
- Fresh browser session (no localStorage purchase token)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open a new incognito/private window
2. Navigate to `https://dev.fieldview.live/direct/[slug]` for a paywalled stream
3. Observe the PaywallModal
4. Attempt to dismiss the modal without purchasing
5. Verify video content is not accessible
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
PaywallModal renders with stream price and purchase form. Video player is hidden or blurred behind the modal. Modal cannot be dismissed without valid purchase or access code.
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
Flow: localStorage check -> server verify -> grant/deny. Square Web Payments SDK handles checkout.
<span style="display:none">{/traklet:section:notes}</span>
