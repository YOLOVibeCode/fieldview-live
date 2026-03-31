---
id: TC-AP-003
title: Viewer manages stream subscriptions on account page
priority: high
labels:
  - account
  - viewer
  - subscriptions
suite: account
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the `/account` page shows active stream subscriptions and allows the viewer to unsubscribe.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Authenticated viewer with at least one active subscription (via TC-DS-002 NotifyMe)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/account`
2. Verify Stream Subscriptions section loads (`GET /api/public/viewer/{id}/subscriptions`)
3. Verify each subscription shows the stream name/slug
4. Click "Unsubscribe" on a subscription
5. Verify `DELETE /api/public/direct/{slug}/notify-me` is called
6. Verify the subscription is removed from the list
7. If no subscriptions: verify empty state message
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Subscriptions list fetched on page load
- Unsubscribe removes the item immediately
- Empty state shown when all subscriptions removed
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
Cross-references TC-DS-002 (NotifyMe subscribe) for end-to-end subscription lifecycle.
{/traklet:section:notes}
