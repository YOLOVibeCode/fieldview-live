---
id: TC-OW-012
title: Owner edits watch link channel stream and settings
priority: high
labels:
  - owner
  - watch-links
  - update
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify an owner can expand a channel row to edit its stream URL and access mode (free vs pay-per-view), with Mux URL auto-detection.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-OW-007 (watch links list loads)
- At least one channel in the list
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. On `/owners/watch-links`, click a channel row
2. Verify inline edit form expands with stream URL input and access mode dropdown
3. Paste a Mux URL (`stream.mux.com/xxx`) — verify auto-detection note
4. Change access mode from "Free" to "Pay Per View" — verify price input appears
5. Enter a price, click "Save Changes"
6. Verify two API calls: `PATCH .../channels/:teamSlug/settings` + `PATCH .../channels/:teamSlug`
7. Verify channel row updates with new values
8. Click "Cancel" — verify form closes without saving
9. Paste a non-Mux HLS URL — verify streamType stays `byo_hls`
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Mux URLs auto-detected by regex (`stream.mux.com/{playbackId}`)
- Settings PATCH updates access mode and price
- Stream PATCH updates the stream source
- Channel row refreshes with updated values after save
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
Two separate PATCH endpoints handle settings vs stream — they update different aspects of the channel.
{/traklet:section:notes}
