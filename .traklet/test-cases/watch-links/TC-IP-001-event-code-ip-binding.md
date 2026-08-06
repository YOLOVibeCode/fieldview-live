---
id: TC-IP-001
title: Event code IP binding blocks second household IP (if enabled)
priority: high
labels:
  - watch-links
  - security
suite: watch-links
backend-id: "204"
last-synced: "2026-08-05T21:32:09.111Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
When policy requires first IP binding for an event code, second distinct IP should be denied (or subnet rules per spec).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Feature flag / channel setting that enables IP binding
- Two networks or VPN exit IPs (phone tether + home) OR two testers
- One fresh event code
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Tester A opens URL with code from IP `A` — confirm success
2. Tester B opens same URL with code from IP `B` within expiry window
3. Record whether access denied per policy
4. Optional: Tester A again from IP `A` still works
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Behavior matches security spec (strict deny vs /24 forgiveness documented in **docs/e2e-test-checklist** IP-* intent).
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
If only API-level test is available, mirror Playwright `ip-binding.spec.ts` headers pattern in notes.
<span style="display:none">{/traklet:section:notes}</span>
