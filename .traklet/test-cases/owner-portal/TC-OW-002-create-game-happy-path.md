---
id: TC-OW-002
title: Owner creates a new game with required fields
priority: high
labels:
  - owner
  - games
suite: owner-portal
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Validate game creation flow from owner UI through success confirmation (keyword/slug shown).
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Logged-in owner with permission to create games
- Disposable test data (title, schedule) approved for env
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Navigate to new game flow (`/owners/games/new` or current path)
2. Fill required fields per form labels / `data-testid`
3. Submit and capture generated keyword or public URL snippet
4. Open public viewer link in incognito to sanity-check (optional)
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Game persisted; listed on dashboard; no duplicate-keyword error unless expected.
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
Clean up test games per QA policy to avoid polluting prod leaderboards.
{/traklet:section:notes}
