---
id: TC-CW-002
title: Valid checkout reaches Square payment experience
priority: critical
labels:
  - checkout
  - square
suite: checkout
backend-id: "150"
last-synced: "2026-08-05T21:31:06.028Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
After valid form submission, user is routed to Square Web Payments / payment step (or embedded pay button activates) without 500 from FieldView API.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Valid checkout fixture with non-expired game/watch link
- Browser allows third-party scripts/SDKs required by Square
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Complete required checkout fields with test data
2. Submit / Continue to payment
3. Verify payment UI appears (`data-testid` hooks like `square-card-container` / `pay-now` if applicable)
4. In Network tab, confirm FieldView creates/updates purchase session without error response
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Payment step reachable. No blank screen after submit. Errors from Square shown in-user, not silent failure.
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
Completing a real charge may be out of scope in some envs; stopping at payment iframe load is acceptable if documented.
<span style="display:none">{/traklet:section:notes}</span>
