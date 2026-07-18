---
id: TC-OW-003
title: Owner configures stable watch link (org/channel)
priority: high
labels:
  - owner
  - watch-links
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Ensure owners can create/update organization or channel settings that power `/watch/{org}/{team}` (access mode, price, playback binding).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Owner role with watch-link management in UI (path may be `owners/watch-links/new` or nested in coach console)
- Test org slug not conflicting with production marketing names
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open watch-link or channel configuration in owner portal
2. Set or verify `accessMode` (public free vs pay-per-view) and price if paid
3. Save and copy shareable `/watch/...` URL
4. Validate with TC-WF-001 or TC-WP-001 in fresh session
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Settings persist after refresh. Public URL respects new mode within cache/propagation limits (note delay if CDN).
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
If UI moved under coach dashboard, update steps once per release in Notes only.
{/traklet:section:notes}
