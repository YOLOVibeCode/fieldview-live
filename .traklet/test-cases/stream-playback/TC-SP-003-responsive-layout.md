---
id: TC-SP-003
title: Responsive layout adapts across breakpoints
priority: high
labels:
  - stream
  - responsive
  - layout
suite: stream-playback
---

{traklet:test-case}

{traklet:section:objective}
## Objective
Verify that the stream page layout correctly adapts between mobile, tablet, and desktop breakpoints.
{/traklet:section:objective}

{traklet:section:prerequisites}
## Prerequisites
- Active direct stream page
- Browser dev tools or multiple device sizes available
{/traklet:section:prerequisites}

{traklet:section:steps}
## Steps
1. Open a direct stream page at desktop width (>1024px)
2. Verify chat is in sidebar, scoreboard is in sidebar
3. Resize to tablet width (640-1024px)
4. Verify sidebars use responsive widths `min(360px, 45vw)`
5. Resize to mobile width (<640px)
6. Verify chat moves to BottomSheet with FAB toggle
7. Verify scoreboard renders as floating overlay
8. Verify video has minHeight of 200px
{/traklet:section:steps}

{traklet:section:expected-result}
## Expected Result
Layout transitions smoothly. Chat position changes from `sidebar` to `bottom-sheet`. Scoreboard position changes from `sidebar` to `floating`. No content overflow or clipping.
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
Breakpoints: xs(0), sm(375), md(640), lg(1024), xl(1440). useResponsive hook drives layout.
{/traklet:section:notes}
