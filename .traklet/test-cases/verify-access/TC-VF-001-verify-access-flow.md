---
id: TC-VF-001
title: Verify access page accepts magic link or code and grants session
priority: high
labels:
  - verify-access
  - auth
suite: verify-access
---

{traklet:test-case}

{traklet:section:objective}
## Objective
`/verify-access` (or current path) correctly validates emailed or shared tokens and redirects to the watch experience without breaking purchase state.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- One-time or time-limited verify link from email (test inbox) OR manual token from support
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Paste magic link or open from email on target device
2. Complete any on-page confirm step
3. Confirm redirect to game/watch and player accessible
4. Try reusing same token in new session — expect one-time failure if designed
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Happy path grants access; expired/replayed tokens show safe error (**TC-EX-001** for time window).
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
Cross-reference Playwright `verify-access.spec.ts` for canonical selectors.
{/traklet:section:notes}
