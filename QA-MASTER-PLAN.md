# QA Master Plan - FieldView.Live
> **Generated**: 2026-01-22
> **Status**: ACTIVE
> **Purpose**: Complete QA analysis, test coverage gaps, and legacy code cleanup

---

## Executive Summary

This document represents the complete QA analysis of the FieldView.Live codebase. It maps every specification requirement to test coverage, identifies gaps, catalogs legacy code for deletion, and provides a roadmap for achieving world-class test coverage.

### Current State
| Metric | Count |
|--------|-------|
| Unit Test Files | 48 |
| E2E Test Files | 33 |
| Legacy Files to Delete | 39 |
| Critical Test Gaps | 6 |
| Specification Coverage | ~70% |

---

## Table of Contents

1. [Specification Coverage Matrix](#1-specification-coverage-matrix)
2. [Critical Test Gaps](#2-critical-test-gaps)
3. [Pending Tests to Create](#3-pending-tests-to-create)
4. [Legacy Files to Delete](#4-legacy-files-to-delete)
5. [Test Infrastructure Cleanup](#5-test-infrastructure-cleanup)
6. [Current Test Inventory](#6-current-test-inventory)
7. [Action Plan](#7-action-plan)

---

## 1. Specification Coverage Matrix

### User Flow A: Text-to-Pay (Primary Revenue Path)

| Requirement | Spec Reference | Test Coverage | Status |
|-------------|----------------|---------------|--------|
| SMS inbound webhook parsing | `02-user-flows.md` Flow A | None | :x: **GAP** |
| Keyword lookup → game match | `02-user-flows.md` Flow A | None | :x: **GAP** |
| Payment link SMS reply | `02-user-flows.md` Flow A | None | :x: **GAP** |
| Checkout form validation | `02-user-flows.md` Flow A | `checkout-to-watch.spec.ts` | :white_check_mark: |
| Email required validation | `03-functional-requirements.md` FR-3 | `checkout-to-watch.spec.ts` | :white_check_mark: |
| Payment → watch redirect | `02-user-flows.md` Flow A | `checkout-to-watch.spec.ts` | :white_check_mark: |
| Watch link generation | `02-user-flows.md` Flow A | `pay-per-view.spec.ts` | :white_check_mark: |
| STOP/HELP SMS compliance | `02-user-flows.md` Flow A | None | :x: **GAP** |
| Duplicate keyword handling | `02-user-flows.md` Flow A | None | :x: **GAP** |

### User Flow B: QR-to-Pay (Secondary)

| Requirement | Spec Reference | Test Coverage | Status |
|-------------|----------------|---------------|--------|
| QR landing page loads | `02-user-flows.md` Flow B | None | :x: **GAP** |
| Game info + price display | `02-user-flows.md` Flow B | None | :x: **GAP** |
| Payment completion | `02-user-flows.md` Flow B | `checkout-to-watch.spec.ts` | :white_check_mark: |
| Video playback after payment | `02-user-flows.md` Flow B | `demo-v2.spec.ts` | :white_check_mark: |

### User Flow C: Owner Create Game

| Requirement | Spec Reference | Test Coverage | Status |
|-------------|----------------|---------------|--------|
| Owner login | `02-user-flows.md` Flow C | `owner-login.spec.ts` | :white_check_mark: |
| Game creation form | `02-user-flows.md` Flow C | None | :x: **GAP** |
| Keyword auto-generation | `02-user-flows.md` Flow C | None | :x: **GAP** |
| Keyword collision handling | `02-user-flows.md` Flow C | None | :x: **GAP** |
| QR URL generation | `02-user-flows.md` Flow C | None | :x: **GAP** |
| Game edit/cancel | `02-user-flows.md` Flow C | None | :x: **GAP** |

### User Flow D: Playback + Telemetry

| Requirement | Spec Reference | Test Coverage | Status |
|-------------|----------------|---------------|--------|
| Watch page loads | `02-user-flows.md` Flow D | `public-free.spec.ts` | :white_check_mark: |
| Entitlement validation | `02-user-flows.md` Flow D | `paywall-security.spec.ts` | :white_check_mark: |
| HLS player initialization | `02-user-flows.md` Flow D | `VideoPlayer.test.tsx` | :white_check_mark: |
| PlaybackSession creation | `02-user-flows.md` Flow D | API route tests | :white_check_mark: |
| Telemetry: playback start/stop | `02-user-flows.md` Flow D | None | :x: **GAP** |
| Telemetry: buffering events | `02-user-flows.md` Flow D | None | :x: **GAP** |
| Telemetry: fatal errors | `02-user-flows.md` Flow D | None | :x: **GAP** |
| Telemetry: network switches | `02-user-flows.md` Flow D | None | :x: **GAP** |

### User Flow E: Automatic Refund

| Requirement | Spec Reference | Test Coverage | Status |
|-------------|----------------|---------------|--------|
| Telemetry aggregation across sessions | `07-refund-and-quality-rules.md` | None | :x: **CRITICAL** |
| Buffer ratio calculation | `07-refund-and-quality-rules.md` | None | :x: **CRITICAL** |
| Full refund trigger (>20% buffer) | `07-refund-and-quality-rules.md` | None | :x: **CRITICAL** |
| Half refund trigger (10-20% buffer) | `07-refund-and-quality-rules.md` | None | :x: **CRITICAL** |
| Partial refund (>10 buffer events) | `07-refund-and-quality-rules.md` | None | :x: **CRITICAL** |
| Refund SMS notification | `07-refund-and-quality-rules.md` | None | :x: **CRITICAL** |
| Audit log creation | `07-refund-and-quality-rules.md` | None | :x: **CRITICAL** |
| Threshold version tracking | `07-refund-and-quality-rules.md` | None | :x: **CRITICAL** |

### User Flow F: Owner Dashboard

| Requirement | Spec Reference | Test Coverage | Status |
|-------------|----------------|---------------|--------|
| Dashboard loads | `02-user-flows.md` Flow F | None | :x: **GAP** |
| Per-game stats display | `02-user-flows.md` Flow F | None | :x: **GAP** |
| Revenue totals (gross/net/refunds) | `02-user-flows.md` Flow F | None | :x: **GAP** |
| Payout status | `02-user-flows.md` Flow F | None | :x: **GAP** |
| Audience view (masked emails) | `02-user-flows.md` Flow H | `viewer-analytics.spec.ts` | :white_check_mark: |
| Time-series analytics | `02-user-flows.md` Flow F | None | :x: **GAP** |

### User Flow G: Admin Console

| Requirement | Spec Reference | Test Coverage | Status |
|-------------|----------------|---------------|--------|
| Admin login + MFA | `08-admin-and-superadmin.md` | `admin-login.spec.ts` | :white_check_mark: |
| Global search (phone/email/keyword) | `08-admin-and-superadmin.md` | `live.admin-console.spec.ts` | :white_check_mark: |
| Viewer detail view | `08-admin-and-superadmin.md` | None | :x: **GAP** |
| Purchase detail timeline | `08-admin-and-superadmin.md` | None | :x: **GAP** |
| Manual refund with reason | `08-admin-and-superadmin.md` | None | :x: **GAP** |
| Refund investigation view | `08-admin-and-superadmin.md` | None | :x: **GAP** |
| Audit log viewing | `08-admin-and-superadmin.md` | None | :x: **GAP** |
| SuperAdmin config changes | `08-admin-and-superadmin.md` | None | :x: **GAP** |

### Direct Stream Features

| Feature | Unit Tests | E2E Tests | Status |
|---------|------------|-----------|--------|
| Chat messaging | `v2/chat/*.test.tsx` (37 tests) | `chat-integration.spec.ts`, `game-chat.spec.ts` | :white_check_mark: |
| Scoreboard display/edit | `v2/scoreboard/*.test.tsx` (31 tests) | `scoreboard-*.spec.ts` (5 files) | :white_check_mark: |
| Video player | `v2/video/*.test.tsx` (43 tests) | `demo-v2.spec.ts`, `direct-streams.spec.ts` | :white_check_mark: |
| Paywall modal | `usePaywall.test.ts` (23 tests) | `paywall*.spec.ts` (3 files) | :white_check_mark: |
| Viewer auth | `PasswordInput.test.tsx` (11 tests) | `cross-stream-auth.spec.ts`, `viewer-registration-form.spec.ts` | :white_check_mark: |
| Admin panel | None | `admin-panel-jwt.spec.ts` | :warning: Partial |

---

## 2. Critical Test Gaps

### :rotating_light: CRITICAL: Automatic Refund System (Revenue Protection)

**Impact**: Refunds are a core business promise. Without tests, refund logic could break silently.

**Missing Tests**:
```
apps/api/src/services/__tests__/RefundService.test.ts (TO CREATE)
├── Telemetry aggregation across sessions
├── Buffer ratio calculation (bufferMs / watchMs)
├── Downtime ratio calculation (streamDownMs / expectedDuration)
├── Full refund trigger: bufferRatio > 0.20
├── Full refund trigger: downtimeRatio > 0.20
├── Full refund trigger: fatalErrors >= 3 AND watchMs < 5min
├── Half refund trigger: 0.10 < bufferRatio <= 0.20
├── Partial refund trigger: bufferEvents > 10
├── No refund: watchMs < 30 seconds (fraud prevention)
├── Refund stacking prevention (highest only)
├── SMS notification content
├── Audit log creation with inputs/outputs
└── Threshold version tracking
```

### :rotating_light: CRITICAL: SMS Flow (Primary Revenue Path)

**Impact**: SMS is the primary customer acquisition channel. No E2E coverage.

**Missing Tests**:
```
apps/web/__tests__/e2e/sms-to-pay.spec.ts (TO CREATE)
├── Inbound SMS webhook receives keyword
├── Keyword parsed and game matched
├── Payment link SMS sent
├── Invalid keyword returns friendly error
├── Expired game keyword returns status
├── STOP command opts out user
├── HELP command returns instructions
└── Duplicate texts are idempotent
```

### :warning: HIGH: Owner Dashboard (Core Owner Experience)

**Missing Tests**:
```
apps/web/__tests__/e2e/04-owner/dashboard.spec.ts (TO CREATE)
├── Dashboard loads after login
├── Revenue summary displays correctly
├── Per-game stats drill-down
├── Refund amounts reflected in totals
├── Payout status indicator
└── Date range filtering works
```

### :warning: HIGH: Game Management (Owner CRUD)

**Missing Tests**:
```
apps/web/__tests__/e2e/04-owner/create-game.spec.ts (TO CREATE)
├── Create game with required fields
├── Keyword auto-generated
├── Duplicate keyword shows alternative
├── Edit game details
├── Cancel game
├── QR code generated
└── Stream URL configuration
```

### :warning: MEDIUM: Admin Manual Refund

**Missing Tests**:
```
apps/web/__tests__/e2e/05-admin/manual-refund.spec.ts (TO CREATE)
├── Search purchase by email
├── View purchase timeline
├── Issue full refund with reason
├── Refund amount bounded by purchase
├── Step-up confirmation required
├── Audit log entry created
└── Double refund prevented
```

### :warning: MEDIUM: Audit Log Verification

**Missing Tests**:
```
apps/web/__tests__/e2e/05-admin/audit-log.spec.ts (TO CREATE)
├── All admin actions logged
├── Audit log displays correctly
├── Filter by action type
├── Filter by date range
├── Viewer identity access logged
└── Immutable (no edit/delete)
```

---

## 3. Pending Tests to Create

### Priority 1: Critical Business Logic (Create Immediately)

| Test File | Location | Est. Tests | Priority |
|-----------|----------|------------|----------|
| `RefundService.test.ts` | `apps/api/src/services/__tests__/` | 15 | :rotating_light: P0 |
| `RefundCalculator.test.ts` | `apps/api/src/lib/__tests__/` | 10 | :rotating_light: P0 |
| `sms-to-pay.spec.ts` | `apps/web/__tests__/e2e/` | 8 | :rotating_light: P0 |

### Priority 2: Owner Experience (Create This Week)

| Test File | Location | Est. Tests | Priority |
|-----------|----------|------------|----------|
| `dashboard.spec.ts` | `apps/web/__tests__/e2e/04-owner/` | 6 | :warning: P1 |
| `create-game.spec.ts` | `apps/web/__tests__/e2e/04-owner/` | 7 | :warning: P1 |
| `watch-link-config.spec.ts` | `apps/web/__tests__/e2e/04-owner/` | 6 | :warning: P1 |

### Priority 3: Admin Operations (Create This Sprint)

| Test File | Location | Est. Tests | Priority |
|-----------|----------|------------|----------|
| `manual-refund.spec.ts` | `apps/web/__tests__/e2e/05-admin/` | 7 | :warning: P2 |
| `audit-log.spec.ts` | `apps/web/__tests__/e2e/05-admin/` | 6 | :warning: P2 |
| `viewer-detail.spec.ts` | `apps/web/__tests__/e2e/05-admin/` | 5 | :warning: P2 |

### Priority 4: Edge Cases (Create Next Sprint)

| Test File | Location | Est. Tests | Priority |
|-----------|----------|------------|----------|
| `qr-scan-flow.spec.ts` | `apps/web/__tests__/e2e/02-viewer/` | 4 | P3 |
| `telemetry-events.spec.ts` | `apps/web/__tests__/e2e/02-viewer/` | 6 | P3 |
| `expired-access.spec.ts` | `apps/web/__tests__/e2e/06-edge-cases/` | 3 | P3 |
| `stream-offline.spec.ts` | `apps/web/__tests__/e2e/06-edge-cases/` | 2 | P3 |

---

## 4. Legacy Files to Delete

### 4.1 Legacy Components (14 files)

These components have v2 replacements and are no longer needed:

```bash
# Components with ZERO production usage - DELETE IMMEDIATELY
rm apps/web/components/ScoreEditModal.tsx
rm apps/web/components/ScoreboardOverlay.tsx
rm apps/web/components/GameChatPanel.tsx
rm apps/web/components/MobileControlBar.tsx
rm apps/web/components/CinemaModeToggle.tsx
rm apps/web/components/FullscreenRegistrationOverlay.tsx

# Components used by legacy pages - DELETE AFTER MIGRATION
rm apps/web/components/FullscreenChatOverlay.tsx
rm apps/web/components/TchsFullscreenChatOverlay.tsx
rm apps/web/components/CollapsibleScoreboardOverlay.tsx
rm apps/web/components/PaywallModal.tsx           # v2 exists
rm apps/web/components/ChatDebugPanel.tsx         # debug/ version exists
rm apps/web/components/AdminPanel.tsx             # needs v2 replacement
rm apps/web/components/SocialProducerPanel.tsx    # needs v2 replacement
rm apps/web/components/ViewerAnalyticsPanel.tsx   # needs v2 replacement
```

### 4.2 Legacy Component Tests (3 files)

```bash
rm apps/web/components/__tests__/ScoreEditModal.test.tsx
rm apps/web/__tests__/components/CollapsibleScoreboardOverlay.test.tsx
rm apps/web/__tests__/integration/multi-user-chat.test.tsx
```

### 4.3 Legacy Hooks (3 files)

```bash
rm apps/web/hooks/useGameChat.ts
rm apps/web/hooks/useGameChatV2.ts
rm apps/web/hooks/__tests__/useGameChat.test.tsx
```

### 4.4 Legacy/Test Pages (7 files)

```bash
# Test pages using deprecated components
rm apps/web/app/demo-complete/page.tsx
rm apps/web/app/test/chat/page.tsx
rm apps/web/app/test/chat-fullscreen/page.tsx
rm apps/web/app/test-player/page.tsx
rm apps/web/app/theme-demo/page.tsx

# Production pages to migrate, then delete
# apps/web/app/direct/tchs/page.tsx           # MIGRATE FIRST
# apps/web/app/direct/tchs/[date]/[team]/page.tsx  # MIGRATE FIRST
```

### 4.5 Duplicate E2E Tests (5 files)

```bash
# Duplicates of tests in __tests__/e2e/
rm apps/web/e2e/cross-stream-auth.spec.ts
rm apps/web/e2e/collapsible-scoreboard.spec.ts
rm apps/web/e2e/tap-to-edit-score.spec.ts
rm apps/web/tests/e2e/paywall.spec.ts
rm apps/web/tests/e2e/scoreboard.spec.ts
```

### 4.6 Directories to Remove

```bash
# After moving any needed files
rm -rf apps/web/e2e/
```

---

## 5. Test Infrastructure Cleanup

### Current Directory Structure (Fragmented)

```
apps/web/
├── __tests__/
│   ├── e2e/              # 20 files - PRIMARY E2E LOCATION
│   ├── components/       # 1 file (legacy)
│   └── integration/      # 1 file (legacy)
├── tests/
│   └── e2e/              # 6 files - DUPLICATE LOCATION
├── e2e/                  # 3 files - DUPLICATE LOCATION
└── components/
    ├── __tests__/        # 2 files (legacy)
    └── v2/
        └── */__tests__/  # 13 files - V2 UNIT TESTS
```

### Target Directory Structure (Consolidated)

```
apps/web/
├── __tests__/
│   └── e2e/              # ALL E2E tests here
│       ├── 00-smoke.spec.ts
│       ├── 01-auth/
│       ├── 02-viewer/
│       ├── 03-watch-links/
│       ├── 04-owner/       # TO CREATE
│       ├── 05-admin/       # TO CREATE
│       └── 06-edge-cases/  # TO CREATE
└── components/
    └── v2/
        └── */__tests__/  # V2 component unit tests

apps/api/
└── src/
    ├── services/__tests__/
    ├── repositories/__tests__/
    ├── routes/__tests__/
    └── lib/__tests__/

packages/data-model/
└── __tests__/

packages/dvr-service/
└── src/providers/*/__tests__/
```

### Migration Commands

```bash
# Move tests from apps/web/tests/e2e/ to apps/web/__tests__/e2e/
mv apps/web/tests/e2e/viewer-analytics.spec.ts apps/web/__tests__/e2e/
mv apps/web/tests/e2e/chat-integration.spec.ts apps/web/__tests__/e2e/
mv apps/web/tests/e2e/demo-v2.spec.ts apps/web/__tests__/e2e/
mv apps/web/tests/e2e/direct-streams.spec.ts apps/web/__tests__/e2e/

# Delete duplicate location
rm -rf apps/web/tests/e2e/
rm -rf apps/web/e2e/
```

---

## 6. Current Test Inventory

### Unit Tests by Package

| Package | Location | Files | Tests |
|---------|----------|-------|-------|
| data-model | `packages/data-model/__tests__/` | 6 | 18 |
| api (repositories) | `apps/api/src/repositories/__tests__/` | 4 | 53 |
| api (services) | `apps/api/src/services/__tests__/` | 5 | 72 |
| api (routes) | `apps/api/src/routes/__tests__/` | 3 | 31 |
| api (integration) | `apps/api/src/__tests__/integration/` | 1 | 26 |
| api (jobs) | `apps/api/src/jobs/__tests__/` | 1 | 5 |
| web (v2 primitives) | `apps/web/components/v2/primitives/__tests__/` | 2 | 39 |
| web (v2 layout) | `apps/web/components/v2/layout/__tests__/` | 1 | 10 |
| web (v2 scoreboard) | `apps/web/components/v2/scoreboard/__tests__/` | 3 | 31 |
| web (v2 chat) | `apps/web/components/v2/chat/__tests__/` | 3 | 37 |
| web (v2 auth) | `apps/web/components/v2/auth/__tests__/` | 1 | 11 |
| web (v2 video) | `apps/web/components/v2/video/__tests__/` | 3 | 43 |
| web (hooks) | `apps/web/hooks/__tests__/` | 3 | 49 |
| dvr-service | `packages/dvr-service/src/providers/*/__tests__/` | 4 | ~20 |
| **TOTAL** | | **40** | **~445** |

### E2E Tests by Category

| Category | Location | Files | Tests |
|----------|----------|-------|-------|
| Smoke | `apps/web/__tests__/e2e/` | 2 | 5 |
| Auth | `apps/web/__tests__/e2e/01-auth/` | 3 | 15 |
| Viewer | `apps/web/__tests__/e2e/02-viewer/` | 1 | 9 |
| Watch Links | `apps/web/__tests__/e2e/03-watch-links/` | 4 | 18 |
| Live Environment | `apps/web/__tests__/e2e/` | 6 | 12 |
| Direct Stream | `apps/web/__tests__/e2e/` | 8 | 45 |
| Paywall | `apps/web/__tests__/e2e/` | 3 | 19 |
| Root E2E | `tests/e2e/` | 4 | 35 |
| **TOTAL** | | **31** | **~158** |

### Tests for Legacy Components (TO DELETE)

| File | Tests | Status |
|------|-------|--------|
| `ScoreEditModal.test.tsx` | 9 | :x: DELETE |
| `CollapsibleScoreboardOverlay.test.tsx` | 18 | :x: DELETE |
| `useGameChat.test.tsx` | 14 | :x: DELETE |
| `multi-user-chat.test.tsx` | ~10 | :x: DELETE |
| **TOTAL TO DELETE** | **~51** | |

---

## 7. Action Plan

### Phase 1: Immediate Cleanup (Day 1)

```bash
# Delete zero-usage legacy components
rm apps/web/components/ScoreEditModal.tsx
rm apps/web/components/ScoreboardOverlay.tsx
rm apps/web/components/MobileControlBar.tsx
rm apps/web/components/CinemaModeToggle.tsx
rm apps/web/components/FullscreenRegistrationOverlay.tsx

# Delete legacy tests
rm apps/web/components/__tests__/ScoreEditModal.test.tsx

# Delete test pages
rm apps/web/app/test-player/page.tsx
rm apps/web/app/theme-demo/page.tsx

# Delete duplicate E2E tests
rm apps/web/e2e/cross-stream-auth.spec.ts
rm apps/web/e2e/collapsible-scoreboard.spec.ts
rm apps/web/e2e/tap-to-edit-score.spec.ts
rm apps/web/tests/e2e/paywall.spec.ts
rm apps/web/tests/e2e/scoreboard.spec.ts
```

### Phase 2: Critical Test Creation (Week 1)

1. Create `apps/api/src/services/__tests__/RefundService.test.ts`
2. Create `apps/api/src/lib/__tests__/RefundCalculator.test.ts`
3. Create `apps/web/__tests__/e2e/sms-to-pay.spec.ts`

### Phase 3: Component Migration (Week 1-2)

1. Update `DirectStreamPageBase.tsx` to use v2 PaywallModal
2. Create v2/admin/AdminPanel.tsx
3. Create v2/admin/ProducerPanel.tsx
4. Migrate TCHS pages to use v2/chat/Chat with config

### Phase 4: Remaining Cleanup (Week 2)

```bash
# After migrations complete
rm apps/web/components/GameChatPanel.tsx
rm apps/web/components/FullscreenChatOverlay.tsx
rm apps/web/components/TchsFullscreenChatOverlay.tsx
rm apps/web/components/CollapsibleScoreboardOverlay.tsx
rm apps/web/components/PaywallModal.tsx
rm apps/web/components/ChatDebugPanel.tsx
rm apps/web/components/AdminPanel.tsx
rm apps/web/components/SocialProducerPanel.tsx
rm apps/web/components/ViewerAnalyticsPanel.tsx

rm apps/web/hooks/useGameChat.ts
rm apps/web/hooks/useGameChatV2.ts
rm apps/web/hooks/__tests__/useGameChat.test.tsx

rm apps/web/app/demo-complete/page.tsx
rm apps/web/app/test/chat/page.tsx
rm apps/web/app/test/chat-fullscreen/page.tsx
rm apps/web/__tests__/components/CollapsibleScoreboardOverlay.test.tsx
rm apps/web/__tests__/integration/multi-user-chat.test.tsx

rm -rf apps/web/e2e/
```

### Phase 5: Owner/Admin Tests (Week 2-3)

1. Create `apps/web/__tests__/e2e/04-owner/dashboard.spec.ts`
2. Create `apps/web/__tests__/e2e/04-owner/create-game.spec.ts`
3. Create `apps/web/__tests__/e2e/05-admin/manual-refund.spec.ts`
4. Create `apps/web/__tests__/e2e/05-admin/audit-log.spec.ts`

### Phase 6: Consolidate Test Directories (Week 3)

```bash
# Move remaining tests to standard locations
mv apps/web/tests/e2e/*.spec.ts apps/web/__tests__/e2e/
rm -rf apps/web/tests/
```

---

## Appendix A: Test ID Conventions

All components should use consistent `data-testid` attributes:

```
btn-{action}           # Buttons: btn-submit, btn-cancel, btn-open-chat
input-{field}          # Inputs: input-email, input-password
form-{name}            # Forms: form-checkout, form-login
error-{field}          # Errors: error-email, error-password
panel-{name}           # Panels: panel-chat, panel-admin
modal-{name}           # Modals: modal-paywall, modal-auth
card-{name}            # Cards: card-score, card-game
```

---

## Appendix B: E2E Test Checklist Reference

See `docs/e2e-test-checklist.md` for the complete test specification with:
- Test pyramid strategy
- Fail-fast ordering
- Environment setup
- CI integration

---

## Appendix C: Specification Documents

| Document | Purpose |
|----------|---------|
| `docs/00-overview.md` | MVP scope and features |
| `docs/01-personas-and-roles.md` | User roles and permissions |
| `docs/02-user-flows.md` | End-to-end user journeys |
| `docs/03-functional-requirements.md` | Functional requirements |
| `docs/07-refund-and-quality-rules.md` | Refund calculation rules |
| `docs/08-admin-and-superadmin.md` | Admin console specification |
| `docs/e2e-test-checklist.md` | E2E test specifications |

---

*Generated by QA Analysis - 2026-01-22*
