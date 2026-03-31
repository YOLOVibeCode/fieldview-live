---
id: TC-EC-002
title: Invalid or expired event code is denied clearly
priority: high
labels:
  - watch-links
  - event-code
  - negative
suite: watch-links
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Bad codes do not grant playback; user sees actionable error (403/404 messaging per product copy).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- A valid URL shape with deliberately wrong code, OR an expired code from history
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open watch URL with garbage `code`
2. Observe HTTP status (if full page) or inline error component
3. Retry with known-expired code if available
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
No player token leakage. Clear denial; support path if documented.
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
Match copy to `verify-access` and API error codes for consistency audits.
{/traklet:section:notes}
