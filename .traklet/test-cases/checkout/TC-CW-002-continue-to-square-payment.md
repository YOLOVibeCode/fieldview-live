---
id: TC-CW-002
title: Valid checkout reaches Square payment experience
priority: critical
labels:
  - checkout
  - square
suite: checkout
---

{traklet:test-case}

{traklet:section:objective}
## Objective
After valid form submission, user is routed to Square Web Payments / payment step (or embedded pay button activates) without 500 from FieldView API.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Valid checkout fixture with non-expired game/watch link
- Browser allows third-party scripts/SDKs required by Square
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Complete required checkout fields with test data
2. Submit / Continue to payment
3. Verify payment UI appears (`data-testid` hooks like `square-card-container` / `pay-now` if applicable)
4. In Network tab, confirm FieldView creates/updates purchase session without error response
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Payment step reachable. No blank screen after submit. Errors from Square shown in-user, not silent failure.
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
Completing a real charge may be out of scope in some envs; stopping at payment iframe load is acceptable if documented.
{/traklet:section:notes}
