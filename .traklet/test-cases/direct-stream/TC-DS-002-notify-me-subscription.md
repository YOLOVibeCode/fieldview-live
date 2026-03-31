---
id: TC-DS-002
title: Notify Me subscription for scheduled streams
priority: high
labels:
  - direct-stream
  - notify-me
  - subscriptions
suite: direct-stream
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the NotifyMe feature allows viewers to subscribe to reminders for scheduled streams, check subscription status, and unsubscribe.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- A direct stream that is offline but has a scheduled start time
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to a direct stream page that shows "Stream Starting Soon" or offline state
2. Verify "Notify Me" button or form appears
3. Enter email (and optional name) in the NotifyMe form
4. Submit — verify `POST /api/public/direct/{slug}/notify-me` called
5. Verify confirmation shown (subscribed state)
6. Refresh the page — verify subscription status is detected (`GET /api/public/direct/{slug}/notify-me/status`)
7. Unsubscribe — verify `DELETE /api/public/direct/{slug}/notify-me` called
8. Verify unsubscribed state (NotifyMe form reappears)
9. On `/account` page, verify the subscription appears in the subscriptions list
10. Unsubscribe from `/account` — verify removal
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- NotifyMe form visible when stream is offline/scheduled
- Subscribe creates a notification subscription for the viewer
- Status endpoint correctly reports subscribed/unsubscribed state
- Unsubscribe removes the subscription
- Subscription visible and manageable from `/account` page
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
NotifyMeForm component is in `apps/web/components/v2/NotifyMeForm.tsx`. Playwright spec exists at `notify-me.spec.ts`.
{/traklet:section:notes}
