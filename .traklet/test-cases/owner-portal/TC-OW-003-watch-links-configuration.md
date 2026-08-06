---
id: TC-OW-003
title: Owner configures stable watch link (org/channel)
priority: high
labels:
  - owner
  - watch-links
suite: owner-portal
backend-id: "166"
last-synced: "2026-08-05T21:31:24.779Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Ensure owners can create/update organization or channel settings that power `https://dev.fieldview.live/watch/{org}/{team}` (access mode, price, playback binding).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Owner role with watch-link management in UI (path may be `owners/watch-links/new` or nested in coach console)
- Test org slug not conflicting with production marketing names
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open watch-link or channel configuration in owner portal
2. Set or verify `accessMode` (public free vs pay-per-view) and price if paid
3. Save and copy shareable `https://dev.fieldview.live/watch/...` URL
4. Validate with TC-WF-001 or TC-WP-001 in fresh session
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Settings persist after refresh. Public URL respects new mode within cache/propagation limits (note delay if CDN).
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
If UI moved under coach dashboard, update steps once per release in Notes only.
<span style="display:none">{/traklet:section:notes}</span>
