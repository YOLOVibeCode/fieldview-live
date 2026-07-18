---
id: TC-IP-001
title: Event code IP binding blocks second household IP (if enabled)
priority: high
labels:
  - watch-links
  - security
suite: watch-links
---

{traklet:test-case}

{traklet:section:objective}
## Objective
When policy requires first IP binding for an event code, second distinct IP should be denied (or subnet rules per spec).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Feature flag / channel setting that enables IP binding
- Two networks or VPN exit IPs (phone tether + home) OR two testers
- One fresh event code
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Tester A opens URL with code from IP `A` — confirm success
2. Tester B opens same URL with code from IP `B` within expiry window
3. Record whether access denied per policy
4. Optional: Tester A again from IP `A` still works
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Behavior matches security spec (strict deny vs /24 forgiveness documented in **docs/e2e-test-checklist** IP-* intent).
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
If only API-level test is available, mirror Playwright `ip-binding.spec.ts` headers pattern in notes.
{/traklet:section:notes}
