---
id: TC-OW-012
title: Owner edits watch link channel stream and settings
priority: high
labels:
  - owner
  - watch-links
  - update
suite: owner-portal
backend-id: "175"
last-synced: "2026-08-05T21:31:35.339Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify an owner can expand a channel row to edit its stream URL and access mode (free vs pay-per-view), with Mux URL auto-detection.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-OW-007 (watch links list loads)
- At least one channel in the list
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. On `https://dev.fieldview.live/owners/watch-links`, click a channel row
2. Verify inline edit form expands with stream URL input and access mode dropdown
3. Paste a Mux URL (`stream.mux.com/xxx`) — verify auto-detection note
4. Change access mode from "Free" to "Pay Per View" — verify price input appears
5. Enter a price, click "Save Changes"
6. Verify two API calls: `PATCH .../channels/:teamSlug/settings` + `PATCH .../channels/:teamSlug`
7. Verify channel row updates with new values
8. Click "Cancel" — verify form closes without saving
9. Paste a non-Mux HLS URL — verify streamType stays `byo_hls`
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Mux URLs auto-detected by regex (`stream.mux.com/{playbackId}`)
- Settings PATCH updates access mode and price
- Stream PATCH updates the stream source
- Channel row refreshes with updated values after save
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
Two separate PATCH endpoints handle settings vs stream — they update different aspects of the channel.
<span style="display:none">{/traklet:section:notes}</span>
