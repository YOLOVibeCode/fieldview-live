---
id: TC-OW-002
title: Owner creates a new game with required fields
priority: high
labels:
  - owner
  - games
suite: owner-portal
backend-id: "165"
last-synced: "2026-08-05T21:31:23.687Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Validate game creation flow from owner UI through success confirmation (keyword/slug shown).
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Logged-in owner with permission to create games
- Disposable test data (title, schedule) approved for env
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Navigate to new game flow (`https://dev.fieldview.live/owners/games/new` or current path)
2. Fill required fields per form labels / `data-testid`
3. Submit and capture generated keyword or public URL snippet
4. Open public viewer link in incognito to sanity-check (optional)
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Game persisted; listed on dashboard; no duplicate-keyword error unless expected.
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
Clean up test games per QA policy to avoid polluting prod leaderboards.
<span style="display:none">{/traklet:section:notes}</span>
