---
id: TC-EX-001
title: Expired purchase or ended game denies playback clearly
priority: high
labels:
  - edge
  - access
suite: edge-cases
---

{traklet:test-case}

{traklet:section:objective}
## Objective
After game end time or access TTL, viewer sees explicit messaging instead of broken player.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Fixture: past-ended game OR artificially expired access token (staging)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open viewer URL that previously worked
2. Observe copy for ended game / expired access / code expired scenarios
3. Confirm no infinite spinner on video element
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
User-safe terminal state; optional CTA to buy another event or contact support.
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
Align expected strings with product copy deck; file bug if 500 instead of 4xx UX.
{/traklet:section:notes}
