---
id: TC-VA-003
title: Cross-stream viewer auth persists across streams
priority: critical
labels:
  - auth
  - viewer
  - cross-stream
suite: auth-viewer
backend-id: "146"
last-synced: "2026-08-05T21:31:01.254Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that a viewer who registers on one direct stream is automatically authenticated on a second stream without re-registering, via the global viewer auth system.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Two active direct streams (e.g. `https://dev.fieldview.live/direct/tchs` and `https://dev.fieldview.live/direct/stormfc`)
- Incognito browser or cleared localStorage
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/direct/tchs` in a clean browser
2. Register as a viewer (enter email + name)
3. Verify chat unlocks and viewer identity bar appears
4. Navigate to `https://dev.fieldview.live/direct/stormfc`
5. Verify auto-registration occurs (no registration form shown)
6. Verify chat is immediately unlocked on the second stream
7. Refresh the page — verify auth persists across reload
8. Open a new tab to the first stream — verify still authenticated
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Registration on stream A stores global viewer identity in localStorage
- Stream B detects existing identity via `useGlobalViewerAuth` and auto-registers
- `POST /api/public/direct/viewer/auto-register` called for the new stream
- No registration form shown on stream B
- Auth persists across page reloads and tabs
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
Playwright e2e spec exists at `cross-stream-auth.spec.ts`. This Traklet case covers the same flow for manual QA.
<span style="display:none">{/traklet:section:notes}</span>
