---
id: TC-CW-001
title: Checkout form validates required fields
priority: critical
labels:
  - checkout
  - square
  - monetization
suite: checkout
backend-id: "149"
last-synced: "2026-08-05T21:31:04.928Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Ensure required customer fields (e.g. email, name) block progress with accessible errors before payment SDK loads.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- A purchase/checkout URL for a paid game or paid watch link (`https://dev.fieldview.live/checkout/{purchaseId}` or embedded checkout on watch page)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open checkout with empty or invalid email
2. Attempt Continue / Submit
3. Observe `role="alert"` or `data-testid="error-*"` messages
4. Fix fields with valid sample data and confirm errors clear
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Validation prevents handoff until inputs satisfy Zod/rules. Errors are per-field or summarized per design.
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
Use Square sandbox or lowest-risk test purchase per finance policy.
<span style="display:none">{/traklet:section:notes}</span>
