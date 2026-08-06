---
id: TC-CH-002
title: Anonymous viewer can connect and chat
priority: high
labels:
  - chat
  - anonymous
  - auth
suite: chat
backend-id: "148"
last-synced: "2026-08-05T21:31:03.663Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that anonymous (non-registered) viewers automatically get a ViewerIdentity and can participate in chat.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Active direct stream with chat enabled
- Fresh browser session with no prior viewer identity
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/direct/[slug]` in an incognito window (no purchase required or free stream)
2. Observe the chat panel — viewer should be auto-connected
3. Check that a viewer name is assigned
4. Send a chat message
5. Verify the message appears with the anonymous viewer name
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Anonymous viewer gets a `ViewerIdentity` with synthetic email (`anon-<sessionId>@guest.fieldview.live`). Chat connection established via `setExternalIdentity`. Messages display correctly.
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
Anonymous auth uses `useViewerIdentity` + `setExternalIdentity` shared mechanism.
<span style="display:none">{/traklet:section:notes}</span>
