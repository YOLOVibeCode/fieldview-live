# E2E Test Checklist — FieldView.Live

> **Version**: 1.0  
> **Created**: 2026-01-01  
> **Status**: DRAFT  
> **Owner**: QA / Engineering

---

## Test Pyramid Strategy

```
                    ┌─────────────────┐
                    │   E2E (Slow)    │  ← This document
                    │   ~20 tests     │
                    ├─────────────────┤
                    │  Integration    │  ← API route tests
                    │   ~50 tests     │
                    ├─────────────────┤
                    │     Unit        │  ← Service/repo tests
                    │   ~200 tests    │
                    └─────────────────┘
```

### Fail-Fast Ordering

1. **Auth Gate** — If auth fails, all protected tests skip
2. **Core Path** — Viewer checkout → watch (revenue critical)
3. **Watch-Link** — New feature validation
4. **Owner Flows** — Dashboard, game management
5. **Admin Flows** — Support operations
6. **Edge Cases** — Refunds, errors, expiry

---

## Test File Structure

```
apps/e2e/tests/
├── 00-smoke.spec.ts              # Health checks, fail-fast gate
├── 01-auth/
│   ├── owner-login.spec.ts       # Owner auth flow
│   ├── admin-login.spec.ts       # Admin auth + MFA
│   └── viewer-anonymous.spec.ts  # No-login viewer access
├── 02-viewer/
│   ├── checkout-form.spec.ts     # Form validation
│   ├── checkout-to-watch.spec.ts # Full payment → watch
│   ├── qr-scan-flow.spec.ts      # QR → checkout → watch
│   └── playback.spec.ts          # Video player loads
├── 03-watch-links/
│   ├── public-free.spec.ts       # /watch/{org}/{team} free
│   ├── pay-per-view.spec.ts      # /watch/{org}/{team} paid
│   ├── event-code.spec.ts        # /watch/{org}/{team}/{code}
│   └── ip-binding.spec.ts        # One-IP restriction
├── 04-owner/
│   ├── create-game.spec.ts       # Game CRUD
│   ├── dashboard.spec.ts         # Revenue dashboard
│   ├── audience-view.spec.ts     # Live audience list
│   └── watch-link-config.spec.ts # Channel management
├── 05-admin/
│   ├── search-purchase.spec.ts   # Find purchases
│   ├── manual-refund.spec.ts     # Issue refund
│   └── audit-log.spec.ts         # Actions logged
└── 06-edge-cases/
    ├── expired-access.spec.ts    # Watch after expiry
    ├── duplicate-payment.spec.ts # Prevent double-charge
    └── stream-offline.spec.ts    # Handle no stream
```

---

## Test Specifications

### 00-smoke.spec.ts — Smoke Tests (GATE)

**Purpose**: Fast health checks. If these fail, skip all other tests.

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| SM-01 | Home page loads | 200 OK, title matches | P0 |
| SM-02 | API health endpoint | `GET /health` → 200 | P0 |
| SM-03 | Database connected | Health includes `db: ok` | P0 |
| SM-04 | Static assets load | CSS/JS bundles → 200 | P0 |

```typescript
// Fail-fast: if smoke fails, skip remaining suites
test.describe.configure({ mode: 'serial' });

test('SM-01: home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/FieldView/i);
});

test('SM-02: API health', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
});
```

---

### 01-auth/owner-login.spec.ts — Owner Authentication

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| OA-01 | Valid email/password login | Redirect to dashboard | P0 |
| OA-02 | Invalid password | Error message shown | P1 |
| OA-03 | Session persists on refresh | Dashboard still accessible | P1 |
| OA-04 | Logout clears session | Redirect to login | P1 |

```typescript
test('OA-01: valid login redirects to dashboard', async ({ page }) => {
  await page.goto('/owners/login');
  await page.getByTestId('input-email').fill(process.env.TEST_OWNER_EMAIL!);
  await page.getByTestId('input-password').fill(process.env.TEST_OWNER_PASSWORD!);
  await page.getByTestId('btn-submit-login').click();
  await expect(page).toHaveURL(/\/owners\/dashboard/);
});
```

---

### 01-auth/admin-login.spec.ts — Admin Authentication + MFA

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| AA-01 | Valid admin login | MFA prompt shown | P0 |
| AA-02 | Valid MFA code | Access to admin console | P0 |
| AA-03 | Invalid MFA code | Error, retry allowed | P1 |
| AA-04 | MFA timeout | Session expires | P2 |

---

### 01-auth/viewer-anonymous.spec.ts — Anonymous Viewer Access

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| VA-01 | Watch page without login | Page loads (no redirect) | P0 |
| VA-02 | Checkout without login | Form accessible | P0 |
| VA-03 | No PII exposed | No email/name in DOM | P1 |

---

### 02-viewer/checkout-to-watch.spec.ts — Core Revenue Path

**Critical**: This is the primary revenue flow. Must be 100% covered.

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| CW-01 | Valid checkout → payment page | Redirect to Square | P0 |
| CW-02 | Payment success → watch page | Video player loads | P0 |
| CW-03 | Email required validation | Error if missing | P0 |
| CW-04 | Name required validation | Error if missing | P1 |
| CW-05 | Payment failure → error page | User-friendly message | P1 |
| CW-06 | Watch link valid for duration | Access works until expiry | P1 |

```typescript
test('CW-02: payment success shows video player', async ({ page }) => {
  // Arrange: Create test game with known keyword
  const gameId = await createTestGame();
  
  // Act: Complete checkout flow
  await page.goto(`/checkout/${gameId}`);
  await page.getByTestId('input-email').fill('test@example.com');
  await page.getByTestId('input-name').fill('Test User');
  await page.getByTestId('btn-submit-checkout').click();
  
  // Mock payment callback (or use Square sandbox)
  await completeTestPayment(page);
  
  // Assert: Video player visible
  await expect(page.getByTestId('video-player')).toBeVisible();
  await expect(page.locator('video')).toHaveAttribute('src', /.m3u8/);
});
```

---

### 02-viewer/qr-scan-flow.spec.ts — QR Code Entry Point

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| QR-01 | Scan QR → checkout page | Pre-filled game info | P0 |
| QR-02 | Invalid QR code | Error page | P1 |
| QR-03 | Expired game QR | "Game ended" message | P1 |

---

### 02-viewer/playback.spec.ts — Video Player

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| PB-01 | HLS stream loads | Video plays within 5s | P0 |
| PB-02 | Telemetry events fire | `playback_started` logged | P1 |
| PB-03 | Player controls work | Play/pause/volume | P1 |
| PB-04 | Fullscreen toggle | Enters fullscreen | P2 |

---

### 03-watch-links/public-free.spec.ts — Free Watch Links (NEW)

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| WF-01 | `/watch/{org}/{team}` loads | Player renders immediately | P0 |
| WF-02 | No payment form shown | Checkout UI absent | P0 |
| WF-03 | Stream plays | HLS video loads | P0 |
| WF-04 | Invalid org → 404 | Not found page | P1 |
| WF-05 | Invalid team → 404 | Not found page | P1 |
| WF-06 | No active stream | "Stream offline" message | P1 |

```typescript
test('WF-01: public_free channel shows player directly', async ({ page }) => {
  // Arrange: Ensure test org/channel exists with public_free mode
  await page.goto('/watch/testorg/freeteam');
  
  // Assert: Player visible, no checkout form
  await expect(page.getByTestId('video-player')).toBeVisible();
  await expect(page.getByTestId('form-checkout')).not.toBeVisible();
});
```

---

### 03-watch-links/pay-per-view.spec.ts — Paid Watch Links (NEW)

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| WP-01 | `/watch/{org}/{team}` shows checkout | Payment form visible | P0 |
| WP-02 | Price displayed correctly | Shows configured price | P0 |
| WP-03 | Payment → player | After payment, video plays | P0 |
| WP-04 | No payment → no access | Player hidden until paid | P1 |

```typescript
test('WP-01: pay_per_view channel shows checkout form', async ({ page }) => {
  await page.goto('/watch/testorg/paidteam');
  
  // Assert: Checkout form visible with price
  await expect(page.getByTestId('form-checkout')).toBeVisible();
  await expect(page.getByTestId('price-display')).toContainText('$');
});
```

---

### 03-watch-links/event-code.spec.ts — Event Code Access (NEW)

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| EC-01 | `/watch/{org}/{team}/{code}` works | Access granted | P0 |
| EC-02 | Invalid code → denied | 403 or error message | P0 |
| EC-03 | Expired code → denied | "Code expired" message | P1 |
| EC-04 | Code binds to IP | Same code, new IP → denied | P1 |

---

### 03-watch-links/ip-binding.spec.ts — One-IP Restriction (NEW)

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| IP-01 | First access binds IP | Access granted | P0 |
| IP-02 | Same IP, same code | Access still works | P0 |
| IP-03 | Different IP, same code | Access denied | P0 |
| IP-04 | Household (same /24 subnet) | Access allowed | P2 |

```typescript
test('IP-03: different IP denied', async ({ request }) => {
  const code = 'test-event-code';
  
  // First access (binds IP)
  const res1 = await request.get(`/api/public/watch-links/testorg/team?code=${code}`, {
    headers: { 'X-Forwarded-For': '1.2.3.4' }
  });
  expect(res1.status()).toBe(200);
  
  // Second access from different IP
  const res2 = await request.get(`/api/public/watch-links/testorg/team?code=${code}`, {
    headers: { 'X-Forwarded-For': '5.6.7.8' }
  });
  expect(res2.status()).toBe(403);
});
```

---

### 04-owner/create-game.spec.ts — Game Management

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| OG-01 | Create game with valid data | Game created, keyword shown | P0 |
| OG-02 | Duplicate keyword error | Validation error | P1 |
| OG-03 | Edit game details | Changes persisted | P1 |
| OG-04 | Delete game | Game removed from list | P1 |
| OG-05 | Set stream URL | Mux playbackId saved | P0 |

---

### 04-owner/dashboard.spec.ts — Owner Dashboard

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| OD-01 | Dashboard shows revenue | Total purchases visible | P0 |
| OD-02 | Revenue matches ledger | Numbers accurate | P1 |
| OD-03 | Game list displays | All owner's games shown | P1 |
| OD-04 | Filter by date range | Results filtered | P2 |

---

### 04-owner/watch-link-config.spec.ts — Channel Management (NEW)

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| WC-01 | Create organization | Org saved with shortname | P0 |
| WC-02 | Create channel | Channel under org | P0 |
| WC-03 | Set accessMode: public_free | Channel is free | P0 |
| WC-04 | Set accessMode: pay_per_view | Price required | P0 |
| WC-05 | Update stream URL | playbackId saved | P0 |
| WC-06 | Generate event code | Code created with expiry | P1 |

---

### 05-admin/manual-refund.spec.ts — Admin Refunds

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| AR-01 | Search purchase by email | Results displayed | P0 |
| AR-02 | Issue full refund | Refund processed | P0 |
| AR-03 | Refund logged in audit | AuditLog entry created | P1 |
| AR-04 | Double refund prevented | Error message | P1 |

---

### 06-edge-cases/expired-access.spec.ts — Access Expiry

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| EX-01 | Watch after game ends | "Game has ended" message | P1 |
| EX-02 | Watch link after expiry | "Access expired" message | P1 |
| EX-03 | Event code after expiry | "Code expired" message | P1 |

---

### 06-edge-cases/stream-offline.spec.ts — No Active Stream

| ID | Test Case | Expected | Priority |
|----|-----------|----------|----------|
| SO-01 | Watch page, stream offline | "Stream starting soon" | P1 |
| SO-02 | Player reconnects | Auto-retry when stream starts | P2 |

---

## Test Data Requirements

### Fixtures Needed

| Fixture | Description | Location |
|---------|-------------|----------|
| `testOwner` | Owner account for auth tests | `.env.test` |
| `testAdmin` | Admin account with MFA | `.env.test` |
| `testGame` | Game with active stream | Seeded in DB |
| `testOrg` | Organization for watch-links | Seeded in DB |
| `freeChannel` | Channel with `public_free` | Seeded in DB |
| `paidChannel` | Channel with `pay_per_view` | Seeded in DB |
| `testEventCode` | Valid event code | Generated per test |

### Environment Variables

```bash
# apps/e2e/.env.test
TEST_OWNER_EMAIL=test-owner@fieldview.live
TEST_OWNER_PASSWORD=<secure>
TEST_ADMIN_EMAIL=test-admin@fieldview.live
TEST_ADMIN_PASSWORD=<secure>
TEST_ADMIN_MFA_SECRET=<totp-secret>
SQUARE_SANDBOX_TOKEN=<sandbox-token>
BASE_URL=http://localhost:3000
API_URL=http://localhost:4301
```

---

## Execution Plan

### Phase 1: Smoke + Auth (Week 1)
- [ ] `00-smoke.spec.ts` — 4 tests
- [ ] `01-auth/owner-login.spec.ts` — 4 tests
- [ ] `01-auth/admin-login.spec.ts` — 4 tests
- [ ] `01-auth/viewer-anonymous.spec.ts` — 3 tests

### Phase 2: Core Viewer Flow (Week 1-2)
- [ ] `02-viewer/checkout-to-watch.spec.ts` — 6 tests
- [ ] `02-viewer/qr-scan-flow.spec.ts` — 3 tests
- [ ] `02-viewer/playback.spec.ts` — 4 tests

### Phase 3: Watch-Links (Week 2)
- [ ] `03-watch-links/public-free.spec.ts` — 6 tests
- [ ] `03-watch-links/pay-per-view.spec.ts` — 4 tests
- [ ] `03-watch-links/event-code.spec.ts` — 4 tests
- [ ] `03-watch-links/ip-binding.spec.ts` — 4 tests

### Phase 4: Owner + Admin (Week 3)
- [ ] `04-owner/create-game.spec.ts` — 5 tests
- [ ] `04-owner/dashboard.spec.ts` — 4 tests
- [ ] `04-owner/watch-link-config.spec.ts` — 6 tests
- [ ] `05-admin/manual-refund.spec.ts` — 4 tests

### Phase 5: Edge Cases (Week 3-4)
- [ ] `06-edge-cases/expired-access.spec.ts` — 3 tests
- [ ] `06-edge-cases/stream-offline.spec.ts` — 2 tests

---

## CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Start services
        run: docker-compose up -d
        
      - name: Run smoke tests first
        run: pnpm --filter @fieldview/e2e test -- --grep "smoke"
        
      - name: Run full E2E suite
        run: pnpm --filter @fieldview/e2e test
        env:
          BASE_URL: http://localhost:3000
          API_URL: http://localhost:4301
```

---

## Acceptance Criteria

- [ ] All P0 tests pass on `main` branch
- [ ] CI runs E2E on every PR
- [ ] Smoke tests < 30 seconds
- [ ] Full suite < 10 minutes
- [ ] No flaky tests (3 consecutive passes required)
- [ ] Test coverage report generated

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| QA Lead | | | ☐ Pending |
| Tech Lead | | | ☐ Pending |
| Product | | | ☐ Pending |

---

*Generated by FieldView Architecture Team*

