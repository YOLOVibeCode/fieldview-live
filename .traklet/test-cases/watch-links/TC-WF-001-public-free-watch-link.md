---
id: TC-WF-001
title: Public free watch link shows player without checkout form
priority: critical
labels:
  - watch-links
  - smoke
suite: watch-links
backend-id: "205"
last-synced: "2026-08-05T21:32:10.203Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
For `accessMode: public_free`, `https://dev.fieldview.live/watch/{org}/{team}` should render the viewing experience directly (no purchase form).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Org + channel slug pair configured as public free in target DB
- Optional active stream or offline placeholder state
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/watch/{org}/{team}` for the free channel
2. Confirm checkout/pay form for this channel is absent (unless cross-sell is intentional — document)
3. Confirm player shell or stream-offline message appears
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Immediate viewer UX. No paywall for this channel mode. Stream plays or shows defined offline UX (**TC-SO-001**).
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
Record org/team slugs in Traklet only if non-sensitive (internal QA names OK).
<span style="display:none">{/traklet:section:notes}</span>
