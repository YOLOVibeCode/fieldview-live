---
id: TC-DS-001
title: Nested direct stream URL (org/event segments) loads bootstrap
priority: high
labels:
  - direct-stream
  - routing
suite: direct-stream
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Paths like `/direct/{slug}/...` with additional segments (e.g. multi-game schedule) resolve, fetch bootstrap JSON, and render layout — complements **TC-SP-001** which focuses on player start.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Known nested URL from staging or production doc (e.g. TCHS-style slug)
- Network tab available
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to full nested path
2. Wait for layout (admin FAB, scoreboard shell, player region)
3. In Network, confirm direct-stream bootstrap/API calls return 200
4. Regression: open admin panel per **TC-AD-001**
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
No 404 from Next for valid fixture; client handles missing event gracefully if slug wrong.
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
Align with `apps/web/app/direct/[slug]/[[...event]]/page.tsx` routing changes each release.
{/traklet:section:notes}
