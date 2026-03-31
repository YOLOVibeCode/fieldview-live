---
id: TC-VA-002
title: Anonymous session does not leak other viewers PII
priority: high
labels:
  - viewer
  - privacy
suite: auth-viewer
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Spot-check that anonymous watch/checkout pages do not embed emails, full names, or tokens belonging to unrelated users in HTML or visible JSON blobs.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Open DevTools → Elements / Sources; optional Network filter for bootstrap JSON
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. As anonymous, load a public game or watch page you did not purchase
2. Search page source and initial API responses for patterns like `@`, `email`, `phone`
3. Confirm only expected marketing/support copy or your own typed form values appear
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
No bulk PII leaks in initial document; API responses scoped to current viewer/session only.
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
If anything suspicious appears, capture HAR (redacted) and file security ticket.
{/traklet:section:notes}
