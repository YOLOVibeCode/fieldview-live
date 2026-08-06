---
id: TC-VA-002
title: Anonymous session does not leak other viewers PII
priority: high
labels:
  - viewer
  - privacy
suite: auth-viewer
backend-id: "145"
last-synced: "2026-08-05T21:31:00.076Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Spot-check that anonymous watch/checkout pages do not embed emails, full names, or tokens belonging to unrelated users in HTML or visible JSON blobs.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Open DevTools → Elements / Sources; optional Network filter for bootstrap JSON
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. As anonymous, open `https://dev.fieldview.live/watch/[org]/[team]` (or `https://dev.fieldview.live/game/[gameId]`) — a page you did not purchase
2. Search page source and initial API responses for patterns like `@`, `email`, `phone`
3. Confirm only expected marketing/support copy or your own typed form values appear
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
No bulk PII leaks in initial document; API responses scoped to current viewer/session only.
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
If anything suspicious appears, capture HAR (redacted) and file security ticket.
<span style="display:none">{/traklet:section:notes}</span>
