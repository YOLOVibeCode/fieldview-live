---
id: TC-SM-001
title: Marketing home loads and shows FieldView branding
priority: critical
labels:
  - smoke
  - regression
suite: smoke
backend-id: "184"
last-synced: "2026-08-05T21:31:45.886Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Confirm the public home page responds successfully and exposes primary entry points (owner, demo, admin).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Network access to the target environment (staging or production)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/` in a fresh tab
2. Confirm document title contains "FieldView"
3. Verify visible CTAs: Owner Login, Get Started, View Demo Stream (or environment equivalent)
4. Optional: open DevTools → Network, hard reload, confirm document and main JS/CSS return 200
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Page returns 200. No blank screen or global error overlay. Footer/version widget may show deployed build if enabled.
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
Fail-fast gate: if this fails, stop and fix deployment before deeper tests.
<span style="display:none">{/traklet:section:notes}</span>
