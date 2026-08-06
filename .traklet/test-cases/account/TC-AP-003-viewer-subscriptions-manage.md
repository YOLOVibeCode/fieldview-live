---
id: TC-AP-003
title: Viewer manages stream subscriptions on account page
priority: high
labels:
  - account
  - viewer
  - subscriptions
suite: account
backend-id: "116"
last-synced: "2026-08-05T21:30:26.070Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the `https://dev.fieldview.live/account` page shows active stream subscriptions and allows the viewer to unsubscribe.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Authenticated viewer with at least one active subscription (via TC-DS-002 NotifyMe)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/account`
2. Verify Stream Subscriptions section loads (`GET /api/public/viewer/{id}/subscriptions`)
3. Verify each subscription shows the stream name/slug
4. Click "Unsubscribe" on a subscription
5. Verify `DELETE /api/public/direct/{slug}/notify-me` is called
6. Verify the subscription is removed from the list
7. If no subscriptions: verify empty state message
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Subscriptions list fetched on page load
- Unsubscribe removes the item immediately
- Empty state shown when all subscriptions removed
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
Cross-references TC-DS-002 (NotifyMe subscribe) for end-to-end subscription lifecycle.
<span style="display:none">{/traklet:section:notes}</span>
