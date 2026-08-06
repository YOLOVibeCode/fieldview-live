---
id: TC-DS-001
title: Nested direct stream URL (org/event segments) loads bootstrap
priority: high
labels:
  - direct-stream
  - routing
suite: direct-stream
backend-id: "157"
last-synced: "2026-08-05T21:31:14.151Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Paths like `https://dev.fieldview.live/direct/{slug}/...` with additional segments (e.g. multi-game schedule) resolve, fetch bootstrap JSON, and render layout — complements **TC-SP-001** which focuses on player start.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Known nested URL from staging or production doc (e.g. TCHS-style slug)
- Network tab available
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/direct/[slug]/[event-slug]` (full nested URL)
2. Wait for layout (admin FAB, scoreboard shell, player region)
3. In Network, confirm direct-stream bootstrap/API calls return 200
4. Regression: open admin panel per **TC-AD-001**
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
No 404 from Next for valid fixture; client handles missing event gracefully if slug wrong.
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
Align with `apps/web/app/direct/[slug]/[[...event]]/page.tsx` routing changes each release.
<span style="display:none">{/traklet:section:notes}</span>
