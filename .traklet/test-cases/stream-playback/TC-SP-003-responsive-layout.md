---
id: TC-SP-003
title: Responsive layout adapts across breakpoints
priority: high
labels:
  - stream
  - responsive
  - layout
suite: stream-playback
backend-id: "188"
last-synced: "2026-08-05T21:31:50.586Z"
---

<span style="display:none">{traklet:test-case}</span>

<span style="display:none">{traklet:section:objective}</span>
## Objective
Verify that the stream page layout correctly adapts between mobile, tablet, and desktop breakpoints.
<span style="display:none">{/traklet:section:objective}</span>

<span style="display:none">{traklet:section:prerequisites}</span>
## Prerequisites
- Active direct stream page
- Browser dev tools or multiple device sizes available
<span style="display:none">{/traklet:section:prerequisites}</span>

<span style="display:none">{traklet:section:steps}</span>
## Steps
1. Open `https://dev.fieldview.live/direct/[slug]` at desktop width (>1024px)
2. Verify chat is in sidebar, scoreboard is in sidebar
3. Resize to tablet width (640-1024px)
4. Verify sidebars use responsive widths `min(360px, 45vw)`
5. Resize to mobile width (<640px)
6. Verify chat moves to BottomSheet with FAB toggle
7. Verify scoreboard renders as floating overlay
8. Verify video has minHeight of 200px
<span style="display:none">{/traklet:section:steps}</span>

<span style="display:none">{traklet:section:expected-result}</span>
## Expected Result
Layout transitions smoothly. Chat position changes from `sidebar` to `bottom-sheet`. Scoreboard position changes from `sidebar` to `floating`. No content overflow or clipping.
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
Breakpoints: xs(0), sm(375), md(640), lg(1024), xl(1440). useResponsive hook drives layout.
<span style="display:none">{/traklet:section:notes}</span>
