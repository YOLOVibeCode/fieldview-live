---
id: TC-CH-002
title: Anonymous viewer can connect and chat
priority: high
labels:
  - chat
  - anonymous
  - auth
suite: chat
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that anonymous (non-registered) viewers automatically get a ViewerIdentity and can participate in chat.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Active direct stream with chat enabled
- Fresh browser session with no prior viewer identity
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open the stream in an incognito window (no purchase required or free stream)
2. Observe the chat panel — viewer should be auto-connected
3. Check that a viewer name is assigned
4. Send a chat message
5. Verify the message appears with the anonymous viewer name
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Anonymous viewer gets a `ViewerIdentity` with synthetic email (`anon-<sessionId>@guest.fieldview.live`). Chat connection established via `setExternalIdentity`. Messages display correctly.
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
Anonymous auth uses `useViewerIdentity` + `setExternalIdentity` shared mechanism.
{/traklet:section:notes}
