---
id: TC-VF-001
title: Verify access page accepts magic link or code and grants session
priority: high
labels:
  - verify-access
  - auth
suite: verify-access
backend-id: "201"
last-synced: "2026-08-05T21:32:05.717Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
`https://dev.fieldview.live/verify-access` (or current path) correctly validates emailed or shared tokens and redirects to the watch experience without breaking purchase state.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- One-time or time-limited verify link from email (test inbox) OR manual token from support
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Paste magic link or open from email — lands on `https://dev.fieldview.live/verify-access?token=...`
2. Complete any on-page confirm step
3. Confirm redirect to game/watch and player accessible
4. Try reusing same token in new session — expect one-time failure if designed
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Happy path grants access; expired/replayed tokens show safe error (**TC-EX-001** for time window).
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
Cross-reference Playwright `verify-access.spec.ts` for canonical selectors.
<span style="display:none">{/traklet:section:notes}</span>
