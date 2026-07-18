---
id: TC-VA-003
title: Cross-stream viewer auth persists across streams
priority: critical
labels:
  - auth
  - viewer
  - cross-stream
suite: auth-viewer
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that a viewer who registers on one direct stream is automatically authenticated on a second stream without re-registering, via the global viewer auth system.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Two active direct streams (e.g. `/direct/tchs` and `/direct/stormfc`)
- Incognito browser or cleared localStorage
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open `/direct/tchs` in a clean browser
2. Register as a viewer (enter email + name)
3. Verify chat unlocks and viewer identity bar appears
4. Navigate to `/direct/stormfc`
5. Verify auto-registration occurs (no registration form shown)
6. Verify chat is immediately unlocked on the second stream
7. Refresh the page — verify auth persists across reload
8. Open a new tab to the first stream — verify still authenticated
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Registration on stream A stores global viewer identity in localStorage
- Stream B detects existing identity via `useGlobalViewerAuth` and auto-registers
- `POST /api/public/direct/viewer/auto-register` called for the new stream
- No registration form shown on stream B
- Auth persists across page reloads and tabs
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
Playwright e2e spec exists at `cross-stream-auth.spec.ts`. This Traklet case covers the same flow for manual QA.
{/traklet:section:notes}
