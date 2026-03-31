---
id: TC-VA-001
title: Anonymous viewer can open watch URL without account
priority: critical
labels:
  - viewer
  - auth
  - watch-links
suite: auth-viewer
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Public watch experience must not force owner login for first paint (access rules still apply per channel).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- A valid `/watch/{org}/{team}` URL for the environment (free or paid channel per sub-test intent)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Use incognito / cleared cookies
2. Navigate to the watch URL
3. Confirm page loads (player shell, checkout, or paywall — not redirect to `/owners/login`)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Appropriate viewer experience for that channel; no spurious owner login wall for merely opening the link.
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
Pair with **TC-WF-001** (free) and **TC-WP-001** (paid) for channel-mode specifics.
{/traklet:section:notes}
