---
id: TC-OW-001
title: Owner dashboard shows games and revenue snapshot
priority: critical
labels:
  - owner
  - dashboard
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
After owner login, dashboard summarizes games and financial snapshot without blank critical widgets.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-OA-001 complete (authenticated owner with at least zero or more games)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open `/owners/dashboard`
2. Verify games list or empty state renders
3. Open revenue section if separate; check Network for failed `/api` calls
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
No uncaught errors. Numbers match rough expectations for test account (optional cross-check with admin console).
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
Large date-range filters are P2; spot-check default range only for manual pass.
{/traklet:section:notes}
