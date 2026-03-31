---
id: TC-SO-001
title: Stream offline shows intentional UX (not hard error)
priority: high
labels:
  - edge
  - playback
suite: edge-cases
---

{traklet:test-case}

{traklet:section:objective}
## Objective
When no live Mux/Vidstack source is available, the page communicates “starting soon” / offline per design rather than a stack trace.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Game or direct stream with no active playback ID / idle state in test env
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open viewer page for idle fixture
2. Read hero/player area messaging
3. Optionally start stream upstream and verify auto-recovery (**TC-SP-001** when live)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Graceful offline UX; telemetry optional; retry behavior documented.
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
Differentiate encoder stop vs Mux asset missing — note which in Actual Result.
{/traklet:section:notes}
