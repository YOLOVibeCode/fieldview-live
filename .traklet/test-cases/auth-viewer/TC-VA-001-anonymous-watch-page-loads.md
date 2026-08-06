---
id: TC-VA-001
title: Anonymous viewer can open watch URL without account
priority: critical
labels:
  - viewer
  - auth
  - watch-links
suite: auth-viewer
backend-id: "144"
last-synced: "2026-08-05T21:30:58.905Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Public watch experience must not force owner login for first paint (access rules still apply per channel).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- A valid `https://dev.fieldview.live/watch/{org}/{team}` URL for the environment (free or paid channel per sub-test intent)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Use incognito / cleared cookies
2. Navigate to the watch URL
3. Confirm page loads (player shell, checkout, or paywall — not redirect to `https://dev.fieldview.live/owners/login`)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Appropriate viewer experience for that channel; no spurious owner login wall for merely opening the link.
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
Pair with **TC-WF-001** (free) and **TC-WP-001** (paid) for channel-mode specifics.
<span style="display:none">{/traklet:section:notes}</span>
