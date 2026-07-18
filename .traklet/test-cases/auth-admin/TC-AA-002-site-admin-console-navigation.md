---
id: TC-AA-002
title: Site admin console primary navigation works
priority: high
labels:
  - admin
  - console
suite: auth-admin
---

{traklet:test-case}

{traklet:section:objective}
## Objective
From an authenticated console session, core screens load without 500s (purchases, revenue, coupons as deployed).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Completed TC-AA-001 (or existing admin session)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open admin console landing
2. Navigate to each primary sidebar/area your role can access (e.g. purchases, revenue, coupons, direct streams if enabled)
3. Watch for error banners, blank data grids, or failed API calls in Network tab
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Each page renders a coherent shell and fetches data (empty state acceptable). No uncaught errors blocking the layout.
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
Scope follows RBAC: note if a link is hidden vs denied with 403.
{/traklet:section:notes}
