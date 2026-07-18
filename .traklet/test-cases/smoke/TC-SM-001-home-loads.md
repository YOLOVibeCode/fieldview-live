---
id: TC-SM-001
title: Marketing home loads and shows FieldView branding
priority: critical
labels:
  - smoke
  - regression
suite: smoke
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Confirm the public home page responds successfully and exposes primary entry points (owner, demo, admin).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Network access to the target environment (staging or production)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open `/` in a fresh tab
2. Confirm document title contains "FieldView"
3. Verify visible CTAs: Owner Login, Get Started, View Demo Stream (or environment equivalent)
4. Optional: open DevTools → Network, hard reload, confirm document and main JS/CSS return 200
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Page returns 200. No blank screen or global error overlay. Footer/version widget may show deployed build if enabled.
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
Fail-fast gate: if this fails, stop and fix deployment before deeper tests.
{/traklet:section:notes}
