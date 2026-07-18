---
id: TC-CN-001
title: Console admin searches purchase by email
priority: high
labels:
  - admin
  - purchases
suite: admin-console
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Support staff can locate a purchase record via global or purchases search without 500 errors.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-AA-001 session (site admin)
- Known test purchase email in target env
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open admin console purchases or search surface
2. Enter buyer email (use label / `getByLabel` patterns from Playwright admin specs)
3. Execute search
4. Open detail row navigates to purchase detail route if applicable
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Record found with status, amount, timestamps. Pagination works if many rows.
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
Redact buyer PII in screenshots attached to Traklet/GH issues.
{/traklet:section:notes}
