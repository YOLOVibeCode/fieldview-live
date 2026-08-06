---
id: TC-CH-001
title: Chat messages send and appear in real-time
priority: critical
labels:
  - chat
  - smoke
  - sse
suite: chat
backend-id: "147"
last-synced: "2026-08-05T21:31:02.481Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that chat messages are sent and received in real-time via SSE between multiple viewers.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Active direct stream with chat enabled
- Two browser windows/tabs logged in as different viewers
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/direct/[slug]` in two separate browser windows (Viewer A and Viewer B)
2. Both viewers should see the chat panel (sidebar on desktop, BottomSheet on mobile)
3. Viewer A types a message and sends it
4. Observe Viewer B's chat panel
5. Viewer B replies
6. Observe Viewer A's chat panel
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Messages appear in both windows within 1-2 seconds. Messages show correct viewer names. SSE connection stays open (no reconnect flicker).
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
Uses InMemoryChatPubSub on the API side. Viewer count equals SSE subscriber count.
<span style="display:none">{/traklet:section:notes}</span>
