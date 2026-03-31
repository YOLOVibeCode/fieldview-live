---
id: TC-EC-001
title: Event code in URL grants access when valid
priority: critical
labels:
  - watch-links
  - event-code
suite: watch-links
---

{traklet:test-case}

{traklet:section:objective}
## Objective
`/watch/{org}/{team}/{code}` (or query-param variant if your build uses it) accepts a valid event code and loads viewer experience.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Non-expired event code tied to a game/channel in target env
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Construct URL with valid `code` segment per routing in `apps/web`
2. Load in fresh session
3. Confirm access (player or post-checkout state) — not “invalid code” error
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
200-level viewer page; code validated server-side; appropriate binding side-effects if IP/device rules apply (**TC-IP-001**).
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
Confirm path style against Next route `watch/[org]/[team]/[[...code]]`.
{/traklet:section:notes}
