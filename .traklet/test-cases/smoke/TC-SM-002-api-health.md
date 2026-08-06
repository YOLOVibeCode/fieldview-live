---
id: TC-SM-002
title: API health endpoint reports OK
priority: critical
labels:
  - smoke
  - api
suite: smoke
backend-id: "185"
last-synced: "2026-08-05T21:31:47.045Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the backend health route responds 200 and reports database connectivity.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Base URL for the API for this environment (e.g. from team runbook or `PLAYWRIGHT_API_BASE_URL`)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. From browser or `curl`, request `GET {API_BASE_URL}/health`
2. Read JSON body for overall status and DB indicator
3. Confirm HTTP status is 200
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
`200` response. Payload indicates healthy service and DB reachable (exact shape per current `health` router implementation).
<span style="display:none">{/traklet:section:expected-result}</span>

<span style="display:none">{traklet:section:actual-result}</span>
## Actual Result
_Not yet tested._
<span style="display:none">{/traklet:section:actual-result}</span>

<span style="display:none">{traklet:section:evidence}</span>
## Evidence
_No recordings or screenshots attached yet._

> **Tip:** Use [Jam.dev](https://jam.dev) to record your testing session, then paste the link here.
<span style="display:none">{/traklet:section:evidence}</span>

<span style="display:none">{traklet:section:diagnostics}</span>
## Diagnostics
_Diagnostics will be auto-attached when submitting results._
<span style="display:none">{/traklet:section:diagnostics}</span>

<span style="display:none">{traklet:section:notes}</span>
## Notes
This is the server behind FieldView.Live, not necessarily a Next.js route.
<span style="display:none">{/traklet:section:notes}</span>
