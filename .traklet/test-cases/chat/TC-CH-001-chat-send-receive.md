---
id: TC-CH-001
title: Chat messages send and appear in real-time
priority: critical
labels:
  - chat
  - smoke
  - sse
suite: chat
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that chat messages are sent and received in real-time via SSE between multiple viewers.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Active direct stream with chat enabled
- Two browser windows/tabs logged in as different viewers
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open the stream in two separate browser windows (Viewer A and Viewer B)
2. Both viewers should see the chat panel (sidebar on desktop, BottomSheet on mobile)
3. Viewer A types a message and sends it
4. Observe Viewer B's chat panel
5. Viewer B replies
6. Observe Viewer A's chat panel
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Messages appear in both windows within 1-2 seconds. Messages show correct viewer names. SSE connection stays open (no reconnect flicker).
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
Uses InMemoryChatPubSub on the API side. Viewer count equals SSE subscriber count.
{/traklet:section:notes}
