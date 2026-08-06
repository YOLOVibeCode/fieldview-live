---
id: TC-AA-007
title: Support admin sees masked emails in audience view
priority: high
labels:
  - auth
  - admin
  - rbac
  - privacy
suite: auth-admin
backend-id: "139"
last-synced: "2026-08-05T21:30:53.264Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that a support_admin sees masked viewer emails (e.g. `jo***@example.com`) in the game audience page, while a super_admin sees the full unmasked emails for the same data.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- A test account with `role: 'support_admin'`
- A test account with `role: 'super_admin'`
- A game with at least one purchaser/watcher with a known email
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Login as support_admin
2. Navigate to a game audience page (`https://dev.fieldview.live/admin/owners/{ownerId}/games/{gameId}/audience`)
3. Verify purchaser and watcher emails are masked (pattern: first 2 chars + `***` + last portion)
4. Note the masked email format
5. Logout
6. Login as super_admin
7. Navigate to the same game audience page
8. Verify purchaser and watcher emails are displayed in full (unmasked)
9. Verify the same data is shown but with different email visibility
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Support admin: emails display as `jo***@example.com` (maskEmail pattern)
- Super admin: emails display as `john@example.com` (full email)
- All other data (purchase dates, session counts, conversion rate) is identical between roles
- API response field `emailMasked` vs full email driven by role
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
Email masking is server-side (via `maskEmail()` utility) — the frontend just renders what the API returns. This is a privacy compliance requirement.
<span style="display:none">{/traklet:section:notes}</span>
