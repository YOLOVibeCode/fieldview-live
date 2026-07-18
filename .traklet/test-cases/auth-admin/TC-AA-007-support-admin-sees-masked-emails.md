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
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that a support_admin sees masked viewer emails (e.g. `jo***@example.com`) in the game audience page, while a super_admin sees the full unmasked emails for the same data.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- A test account with `role: 'support_admin'`
- A test account with `role: 'super_admin'`
- A game with at least one purchaser/watcher with a known email
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Login as support_admin
2. Navigate to a game audience page (`/admin/owners/{ownerId}/games/{gameId}/audience`)
3. Verify purchaser and watcher emails are masked (pattern: first 2 chars + `***` + last portion)
4. Note the masked email format
5. Logout
6. Login as super_admin
7. Navigate to the same game audience page
8. Verify purchaser and watcher emails are displayed in full (unmasked)
9. Verify the same data is shown but with different email visibility
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Support admin: emails display as `jo***@example.com` (maskEmail pattern)
- Super admin: emails display as `john@example.com` (full email)
- All other data (purchase dates, session counts, conversion rate) is identical between roles
- API response field `emailMasked` vs full email driven by role
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
Email masking is server-side (via `maskEmail()` utility) — the frontend just renders what the API returns. This is a privacy compliance requirement.
{/traklet:section:notes}
