---
id: TC-DS-002
title: Notify Me subscription for scheduled streams
priority: high
labels:
  - direct-stream
  - notify-me
  - subscriptions
suite: direct-stream
backend-id: "158"
last-synced: "2026-08-05T21:31:15.329Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the NotifyMe feature allows viewers to subscribe to reminders for scheduled streams, check subscription status, and unsubscribe.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- A direct stream that is offline but has a scheduled start time
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/direct/[slug]` (a stream that shows "Stream Starting Soon" or offline state)
2. Verify "Notify Me" button or form appears
3. Enter email (and optional name) in the NotifyMe form
4. Submit — verify `POST /api/public/direct/{slug}/notify-me` called
5. Verify confirmation shown (subscribed state)
6. Refresh the page — verify subscription status is detected (`GET /api/public/direct/{slug}/notify-me/status`)
7. Unsubscribe — verify `DELETE /api/public/direct/{slug}/notify-me` called
8. Verify unsubscribed state (NotifyMe form reappears)
9. On `https://dev.fieldview.live/account` page, verify the subscription appears in the subscriptions list
10. Unsubscribe from `https://dev.fieldview.live/account` — verify removal
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- NotifyMe form visible when stream is offline/scheduled
- Subscribe creates a notification subscription for the viewer
- Status endpoint correctly reports subscribed/unsubscribed state
- Unsubscribe removes the subscription
- Subscription visible and manageable from `https://dev.fieldview.live/account` page
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
NotifyMeForm component is in `apps/web/components/v2/NotifyMeForm.tsx`. Playwright spec exists at `notify-me.spec.ts`.
<span style="display:none">{/traklet:section:notes}</span>
