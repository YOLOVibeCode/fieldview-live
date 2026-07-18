# Architecture Checklist: Viewer Scoreboard Editing

**Date:** January 17, 2026  
**Status:** ANALYSIS COMPLETE  
**Role:** ARCHITECT  

---

## 📋 Feature Request Summary

Allow **registered viewers** (with admin permission) to:
1. **Tap/click the scoreboard** to enter edit mode
2. **Edit team names** (Home → "Home team name", Away → "Away team name")
3. **Change scores** with +/- buttons on either side
4. **Collapsed view enhancement**: Show minimal score with team colors (Home score above bar, Away below)

---

## 🔍 Current State Analysis

### Existing Components

| Component | Location | Purpose | Supports Editing? |
|-----------|----------|---------|-------------------|
| `Scoreboard` | `apps/web/components/v2/scoreboard/Scoreboard.tsx` | Main scoreboard | ✅ Yes (`editable` prop) |
| `ScoreCard` | `apps/web/components/v2/scoreboard/ScoreCard.tsx` | Individual team display | ✅ Yes (`onTap` prop) |
| `ScoreEditSheet` | `apps/web/components/v2/scoreboard/ScoreEditSheet.tsx` | Edit modal | ✅ Score only |
| `CollapsibleScoreboardOverlay` | `apps/web/components/CollapsibleScoreboardOverlay.tsx` | Overlay with collapse | ✅ Partial (`canEditScore`, `viewerToken`) |
| `SocialProducerPanel` | `apps/web/components/SocialProducerPanel.tsx` | Admin panel | ✅ Full editing |

### Existing API Endpoints

| Endpoint | Method | Access Control | Purpose |
|----------|--------|----------------|---------|
| `/api/direct/:slug/scoreboard` | GET | Public | Get scoreboard state |
| `/api/direct/:slug/scoreboard` | POST | Admin JWT / Producer Password | Update scoreboard |
| `/api/direct/:slug/scoreboard/clock/*` | POST | Admin JWT / Producer Password | Clock controls |

### Database Schema (Relevant Fields)

```prisma
model GameScoreboard {
  producerPassword String?  // Hashed password (NULL = open editing)
  lastEditedBy     String?  // Viewer name or "Admin"
  lastEditedAt     DateTime?
}

model DirectStream {
  scoreboardEnabled Boolean @default(false)
  // ❌ MISSING: allowViewerScoreEdit
  // ❌ MISSING: allowViewerNameEdit
}
```

---

## 🏗️ Proposed Architecture

### 1. Database Schema Changes

```prisma
model DirectStream {
  // Existing
  scoreboardEnabled Boolean @default(false)
  
  // 🆕 NEW FIELDS
  allowViewerScoreEdit  Boolean @default(false)  // Viewers can edit scores
  allowViewerNameEdit   Boolean @default(false)  // Viewers can edit team names
}

model DirectStreamEvent {
  // 🆕 Overrides (NULL = inherit from parent)
  allowViewerScoreEdit  Boolean?
  allowViewerNameEdit   Boolean?
}
```

**Migration Required:** Yes - Add 2 columns to `DirectStream`, 2 to `DirectStreamEvent`

### 2. API Changes

#### New Endpoint: Viewer Score Update
```
POST /api/direct/:slug/scoreboard/viewer-update
```

**Request:**
```json
{
  "viewerToken": "jwt-token-from-registration",
  "field": "homeScore" | "awayScore" | "homeTeamName" | "awayTeamName",
  "value": 1 | -1 | "Team Name String"
}
```

**Validation:**
1. Check `viewerToken` is valid (registered viewer)
2. Check viewer's email is verified (if required)
3. Check `allowViewerScoreEdit` / `allowViewerNameEdit` is enabled
4. Rate limit: Max 10 updates per minute per viewer

**Response:**
```json
{
  "success": true,
  "scoreboard": { /* updated scoreboard state */ }
}
```

### 3. Frontend Component Changes

#### A. ScoreCard Enhancement (Score +/- Buttons)

```tsx
// ScoreCard.tsx additions
interface ScoreCardProps {
  // Existing
  teamName: string;
  score: number;
  editable?: boolean;
  onTap?: () => void;
  
  // 🆕 NEW
  showIncrementButtons?: boolean;   // Show +/- buttons
  onIncrement?: () => void;         // +1 score
  onDecrement?: () => void;         // -1 score
  onNameEdit?: (name: string) => void;  // Edit team name
}
```

**Visual Design:**
```
┌─────────────────────────────┐
│  [-]     HOME      [+]     │  ← Buttons visible when showIncrementButtons=true
│         Team Name          │  ← Tappable for name edit (if allowed)
│           42               │
└─────────────────────────────┘
```

#### B. Collapsed Scoreboard (Minimal View)

**Current Collapsed:**
```
[←] (toggle button only)
```

**Proposed Collapsed Design (User-Specified):**
```
┌─────────────┐
│  H    1     │  ← Home letter + score (home team color)
│   ---->     │  ← Tap to expand
│  A    2     │  ← Away letter + score (away team color)
└─────────────┘
```

**Key Features:**
- Single letter (H/A) for team identification
- Score right-aligned next to letter
- Team jersey color applied to each row
- Arrow button `---->` in center to expand
- Minimal screen footprint for mobile viewing

#### C. Inline Team Name Editor

```tsx
// TeamNameEditor.tsx (new component)
interface TeamNameEditorProps {
  teamName: string;
  placeholder: string;
  editable: boolean;
  onSave: (newName: string) => void;
  color: string;
}

// States:
// 1. Display mode: Shows team name
// 2. Edit mode (on tap): Input field with save/cancel
```

### 4. Permission Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VIEWER TAPS SCOREBOARD                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │   Is viewer registered?        │
                    └───────────────────────────────┘
                           │              │
                          No             Yes
                           │              │
                           ▼              ▼
                 ┌─────────────┐   ┌───────────────────────────┐
                 │ Show "Must  │   │ Is allowViewerScoreEdit   │
                 │ register to │   │ or allowViewerNameEdit    │
                 │ edit" toast │   │ enabled?                  │
                 └─────────────┘   └───────────────────────────┘
                                         │              │
                                        No             Yes
                                         │              │
                                         ▼              ▼
                              ┌─────────────┐   ┌──────────────────┐
                              │ No action   │   │ Show edit UI     │
                              │ (view only) │   │ (+/- buttons or  │
                              └─────────────┘   │  name input)     │
                                                └──────────────────┘
```

### 5. Real-Time Sync Strategy

**Current:** Polling every 2 seconds  
**Recommended:** Keep polling + optimistic updates

```tsx
// Optimistic update flow
const handleScoreIncrement = async (team: 'home' | 'away') => {
  // 1. Optimistic update (immediate UI feedback)
  setScoreboard(prev => ({
    ...prev,
    [team === 'home' ? 'homeScore' : 'awayScore']: prev[team + 'Score'] + 1
  }));
  
  // 2. Send to server
  try {
    await updateScore(team, 1);
  } catch (error) {
    // 3. Rollback on error
    fetchScoreboard(); // Re-fetch real state
    toast.error('Failed to update score');
  }
};
```

---

## 📁 File Change Summary

### New Files
| File | Purpose |
|------|---------|
| `apps/web/components/v2/scoreboard/TeamNameEditor.tsx` | Inline team name editor |
| `apps/web/components/v2/scoreboard/MinimalScoreboard.tsx` | Collapsed minimal view |
| `packages/data-model/prisma/migrations/YYYYMMDD_add_viewer_scoreboard_edit/migration.sql` | Schema migration |

### Modified Files
| File | Changes |
|------|---------|
| `packages/data-model/prisma/schema.prisma` | Add `allowViewerScoreEdit`, `allowViewerNameEdit` |
| `apps/api/src/routes/scoreboard.ts` | Add viewer update endpoint |
| `apps/web/components/v2/scoreboard/ScoreCard.tsx` | Add +/- buttons |
| `apps/web/components/CollapsibleScoreboardOverlay.tsx` | Use MinimalScoreboard for collapsed state |
| `apps/web/components/DirectStreamPageBase.tsx` | Pass viewer permissions to scoreboard |
| `apps/web/components/AdminPanel.tsx` | Add toggle for viewer editing permissions |
| `apps/web/app/superadmin/direct-streams/page.tsx` | Add admin controls |

---

## 🎨 UI/UX Specifications

### Expanded Scoreboard with Viewer Editing

```
┌──────────────────────────────────────────────────────────────┐
│                     FIRST HALF  23:45                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────┐    ┌───────────────────────┐      │
│  │  [-]  HOME TEAM  [+]  │    │  [-]  AWAY TEAM  [+]  │      │
│  │    (tap to edit)      │    │    (tap to edit)      │      │
│  │                       │    │                       │      │
│  │        ██ 2 ██        │    │        ██ 1 ██        │      │
│  │      ▀▀▀▀▀▀▀▀▀▀       │    │      ▀▀▀▀▀▀▀▀▀▀       │      │
│  └───────────────────────┘    └───────────────────────┘      │
│                                                              │
│                         [−] Collapse                         │
└──────────────────────────────────────────────────────────────┘

[-] = Decrement score button (visible only if canEditScore)
[+] = Increment score button (visible only if canEditScore)
Team name tappable only if canEditName
```

### Collapsed Scoreboard (Minimal)

**User-Specified Design:**
```
┌─────────────┐
│  H    1     │  ← Home initial + score (with home team color)
│   ---->     │  ← Expand arrow button
│  A    2     │  ← Away initial + score (with away team color)
└─────────────┘
```

**Implementation Details:**
- `H` / `A` = Single letter abbreviation (or first letter of team name)
- Score displayed next to letter
- Each row uses team's jersey color as text/accent color
- `---->` = Tap to expand (shows full scoreboard)
- Ultra-minimal footprint for mobile viewing

**Visual with Colors:**
```
┌─────────────┐
│  H    1     │  ← Navy (#003366)
│   ---->     │  ← Neutral gray
│  A    2     │  ← Red (#CC0000)
└─────────────┘
```

### Mobile Touch Targets
- +/- buttons: Minimum 44x44px
- Team name tap area: Full width
- Score display: Centered, large font

---

## 🔒 Security Considerations

1. **Rate Limiting**: Max 10 score updates per minute per viewer
2. **Viewer Authentication**: Must have valid `viewerToken` (JWT)
3. **Permission Check**: Admin must enable `allowViewerScoreEdit`/`allowViewerNameEdit`
4. **Audit Trail**: `lastEditedBy` tracks who made changes
5. **Score Bounds**: Prevent negative scores, max 999

---

## 📊 Implementation Priority

| Phase | Feature | Complexity | Dependencies |
|-------|---------|------------|--------------|
| 1 | DB Migration + API endpoint | Medium | None |
| 2 | Admin toggle (enable viewer editing) | Low | Phase 1 |
| 3 | +/- buttons on ScoreCard | Medium | Phase 1 |
| 4 | Team name inline editing | Medium | Phase 1 |
| 5 | Minimal collapsed scoreboard | Low | None |

**Recommended Order:** 5 → 1 → 2 → 3 → 4  
(Start with collapsed view as it's independent)

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Trolling (spam score changes) | High | Rate limiting + admin can disable |
| Conflicting edits | Medium | Last-write-wins + optimistic UI |
| Accidental taps | Medium | Confirm for score decrements |
| Performance (many viewers editing) | Low | Already polling; no WebSocket needed |

---

## ✅ Acceptance Criteria

1. [ ] Registered viewers can see +/- buttons on scores (when admin enables)
2. [ ] Tapping team name opens inline editor (when admin enables)
3. [ ] Collapsed scoreboard shows minimal score + color bars
4. [ ] Admin can toggle `allowViewerScoreEdit` and `allowViewerNameEdit`
5. [ ] Rate limiting prevents abuse (10 updates/min)
6. [ ] `lastEditedBy` shows viewer name after edit
7. [ ] Works on mobile (touch-friendly tap targets)

---

## 🚀 Next Steps

**To proceed with implementation, ask:**
> "You are a software developer. Please implement Phase [1-5] from the viewer scoreboard editing architecture."

---

**ROLE: architect STRICT=true**
