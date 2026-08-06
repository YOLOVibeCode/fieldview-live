---
id: TC-OW-007
title: Owner watch links list shows orgs and channels
priority: critical
labels:
  - owner
  - watch-links
  - read
suite: owner-portal
backend-id: "170"
last-synced: "2026-08-05T21:31:29.666Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify the `https://dev.fieldview.live/owners/watch-links` page lists the owner's organizations with their nested channels, showing stream type, access mode, and clickable watch link previews.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- TC-OA-001 session (authenticated owner)
- At least one org/channel created (TC-OW-003)
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to `https://dev.fieldview.live/owners/watch-links`
2. Verify org cards load from `GET /api/owners/me/watch-links/orgs`
3. Each org card shows name and shortName
4. Each channel row shows: teamSlug, displayName, stream type, access mode (Free / $X.XX)
5. Verify watch link preview `https://dev.fieldview.live/watch/{org}/{team}` is a clickable link (opens in new tab)
6. Verify "+ Create New Watch Link" button links to `https://dev.fieldview.live/owners/watch-links/new`
7. If no orgs: verify empty state message
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
- Orgs fetched with nested channels in a single API call
- Each org rendered as a Card with channels listed inside
- Watch link previews are valid, clickable URLs
- Empty state shown if owner has no organizations
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
Dashboard "Watch Links" card now links here instead of `https://dev.fieldview.live/owners/watch-links/new`.
<span style="display:none">{/traklet:section:notes}</span>
