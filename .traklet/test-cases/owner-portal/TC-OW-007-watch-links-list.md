---
id: TC-OW-007
title: Owner watch links list shows orgs and channels
priority: critical
labels:
  - owner
  - watch-links
  - read
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify the `/owners/watch-links` page lists the owner's organizations with their nested channels, showing stream type, access mode, and clickable watch link previews.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- TC-OA-001 session (authenticated owner)
- At least one org/channel created (TC-OW-003)
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to `/owners/watch-links`
2. Verify org cards load from `GET /api/owners/me/watch-links/orgs`
3. Each org card shows name and shortName
4. Each channel row shows: teamSlug, displayName, stream type, access mode (Free / $X.XX)
5. Verify watch link preview `/watch/{org}/{team}` is a clickable link (opens in new tab)
6. Verify "+ Create New Watch Link" button links to `/owners/watch-links/new`
7. If no orgs: verify empty state message
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
- Orgs fetched with nested channels in a single API call
- Each org rendered as a Card with channels listed inside
- Watch link previews are valid, clickable URLs
- Empty state shown if owner has no organizations
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
Dashboard "Watch Links" card now links here instead of `/owners/watch-links/new`.
{/traklet:section:notes}
