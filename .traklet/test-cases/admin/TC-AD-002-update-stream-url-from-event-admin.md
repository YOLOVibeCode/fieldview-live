---
id: TC-AD-002
title: Producer updates event stream URL after admin unlock
priority: high
labels:
  - admin
  - direct-stream
  - producer
suite: admin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
After **TC-AD-001**, producer can change playback URL / Mux asset for a nested direct event and player picks up new source (or shows reload prompt).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Unlocked admin panel on `/direct/...` event page
- Test-safe HLS or Mux playback URL (may be stub in staging)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open producer admin / stream settings panel
2. Paste new stream URL; save
3. Wait for player to re-bootstrap or manual refresh per UI hint
4. Verify playback attempts new URL (Network → m3u8 host)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Settings persist after page reload; invalid URL shows validation or player error surface, not silent failure.
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
Align with Playwright `direct-stream-event-admin.spec.ts` selectors (`btn-open-admin-panel`, etc.).
{/traklet:section:notes}
