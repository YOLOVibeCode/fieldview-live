---
id: TC-CW-001
title: Checkout form validates required fields
priority: critical
labels:
  - checkout
  - square
  - monetization
suite: checkout
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Ensure required customer fields (e.g. email, name) block progress with accessible errors before payment SDK loads.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- A purchase/checkout URL for a paid game or paid watch link (`/checkout/{purchaseId}` or embedded checkout on watch page)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open checkout with empty or invalid email
2. Attempt Continue / Submit
3. Observe `role="alert"` or `data-testid="error-*"` messages
4. Fix fields with valid sample data and confirm errors clear
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Validation prevents handoff until inputs satisfy Zod/rules. Errors are per-field or summarized per design.
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
Use Square sandbox or lowest-risk test purchase per finance policy.
{/traklet:section:notes}
