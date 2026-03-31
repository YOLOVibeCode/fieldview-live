---
id: TC-SM-002
title: API health endpoint reports OK
priority: critical
labels:
  - smoke
  - api
suite: smoke
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the backend health route responds 200 and reports database connectivity.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Base URL for the API for this environment (e.g. from team runbook or `PLAYWRIGHT_API_BASE_URL`)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. From browser or `curl`, request `GET {API_BASE_URL}/health`
2. Read JSON body for overall status and DB indicator
3. Confirm HTTP status is 200
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
`200` response. Payload indicates healthy service and DB reachable (exact shape per current `health` router implementation).
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
This is the server behind FieldView.Live, not necessarily a Next.js route.
{/traklet:section:notes}
