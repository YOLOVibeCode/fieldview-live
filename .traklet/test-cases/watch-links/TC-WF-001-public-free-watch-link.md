---
id: TC-WF-001
title: Public free watch link shows player without checkout form
priority: critical
labels:
  - watch-links
  - smoke
suite: watch-links
---

{traklet:test-case}

{traklet:section:objective}
## Objective
For `accessMode: public_free`, `/watch/{org}/{team}` should render the viewing experience directly (no purchase form).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Org + channel slug pair configured as public free in target DB
- Optional active stream or offline placeholder state
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/watch/{org}/{team}` for the free channel
2. Confirm checkout/pay form for this channel is absent (unless cross-sell is intentional — document)
3. Confirm player shell or stream-offline message appears
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Immediate viewer UX. No paywall for this channel mode. Stream plays or shows defined offline UX (**TC-SO-001**).
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
Record org/team slugs in Traklet only if non-sensitive (internal QA names OK).
{/traklet:section:notes}
