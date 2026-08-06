---
id: TC-EC-001
title: Event code in URL grants access when valid
priority: critical
labels:
  - watch-links
  - event-code
suite: watch-links
backend-id: "202"
last-synced: "2026-08-05T21:32:06.923Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
`https://dev.fieldview.live/watch/{org}/{team}/{code}` (or query-param variant if your build uses it) accepts a valid event code and loads viewer experience.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Non-expired event code tied to a game/channel in target env
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Construct URL: `https://dev.fieldview.live/watch/[org]/[team]/[code]` with a valid event code
2. Load in fresh session
3. Confirm access (player or post-checkout state) — not “invalid code” error
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
200-level viewer page; code validated server-side; appropriate binding side-effects if IP/device rules apply (**TC-IP-001**).
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
Confirm path style against Next route `watch/[org]/[team]/[[...code]]`.
<span style="display:none">{/traklet:section:notes}</span>
