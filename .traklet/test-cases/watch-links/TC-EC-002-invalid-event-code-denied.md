---
id: TC-EC-002
title: Invalid or expired event code is denied clearly
priority: high
labels:
  - watch-links
  - event-code
  - negative
suite: watch-links
backend-id: "203"
last-synced: "2026-08-05T21:32:08.033Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Bad codes do not grant playback; user sees actionable error (403/404 messaging per product copy).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- A valid URL shape with deliberately wrong code, OR an expired code from history
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/watch/[org]/[team]/invalid-code` with a garbage/expired code
2. Observe HTTP status (if full page) or inline error component
3. Retry with known-expired code if available
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
No player token leakage. Clear denial; support path if documented.
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
Match copy to `verify-access` and API error codes for consistency audits.
<span style="display:none">{/traklet:section:notes}</span>
