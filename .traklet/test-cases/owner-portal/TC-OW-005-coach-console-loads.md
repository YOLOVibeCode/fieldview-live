---
id: TC-OW-005
title: Coach console entry loads for eligible owner
priority: medium
labels:
  - owner
  - coach
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
`/owners/coach` (or linked coach experience) opens for accounts with coach features—watch links, sideline tools, or audience widgets as deployed.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Owner login with coach feature flag or role
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. From dashboard, navigate to Coach (or deep link)
2. Verify primary panels render
3. Smoke one non-destructive action (e.g. view watch link list)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
No auth loop; features match entitlement (hide vs disable for others).
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
Update route names in Notes when product nav changes.
{/traklet:section:notes}
