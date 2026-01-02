# E2E Test Suite — FieldView.Live

> **Test Pyramid**: Fail-fast ordering with smoke tests as gate

## Test Structure

```
apps/web/__tests__/e2e/
├── helpers/
│   └── test-fixtures.ts          # Shared test utilities
├── 00-smoke.spec.ts               # Health checks (GATE)
├── 01-auth/
│   ├── owner-login.spec.ts       # Owner authentication
│   ├── admin-login.spec.ts       # Admin + MFA
│   └── viewer-anonymous.spec.ts  # Anonymous access
├── 02-viewer/
│   └── checkout-to-watch.spec.ts # Core revenue path
├── 03-watch-links/
│   ├── public-free.spec.ts       # Free watch links
│   ├── pay-per-view.spec.ts      # Paid watch links
│   ├── event-code.spec.ts        # Event code security
│   └── ip-binding.spec.ts        # One-IP restriction
└── [legacy tests]
    ├── live.smoke.spec.ts
    ├── live.checkout-form.spec.ts
    ├── live.checkout-to-payment.spec.ts
    ├── live.payment-page.spec.ts
    ├── live.admin-login.spec.ts
    └── live.admin-console.spec.ts
```

## Running Tests

### Prerequisites

```bash
# Set environment variables
export LIVE_TEST_MODE=1
export PLAYWRIGHT_BASE_URL=http://localhost:3000
export PLAYWRIGHT_API_BASE_URL=http://localhost:4301

# Optional: Test accounts
export TEST_ADMIN_EMAIL=admin@fieldview.live
export TEST_ADMIN_PASSWORD=<password>
export TEST_ADMIN_MFA_SECRET=<totp-secret>
```

### Run All Tests

```bash
pnpm test:e2e
```

### Run Specific Suite

```bash
# Smoke tests only (fail-fast gate)
pnpm playwright test apps/web/__tests__/e2e/00-smoke.spec.ts

# Auth tests
pnpm playwright test apps/web/__tests__/e2e/01-auth/

# Watch-link tests
pnpm playwright test apps/web/__tests__/e2e/03-watch-links/
```

### Run with UI

```bash
pnpm playwright test --ui
```

## Test Coverage

| Suite | Tests | Priority | Status |
|-------|-------|----------|--------|
| **00-smoke** | 4 | P0 | ✅ Complete |
| **01-auth** | 11 | P0-P1 | ✅ Complete |
| **02-viewer** | 6 | P0-P1 | ✅ Complete |
| **03-watch-links** | 18 | P0-P1 | ✅ Complete |
| **Total** | **39** | | |

## Test Patterns

### Accessibility-First Selectors

```typescript
// ✅ Preferred
page.getByRole('button', { name: /Sign in/i })
page.getByLabel(/Email Address/i)
page.getByText(/Purchase Stream Access/i)

// ⚠️ Use sparingly (3rd-party widgets)
page.getByTestId('video-player')

// ❌ Avoid
page.locator('.class-name')
```

### Test Data Creation

```typescript
import { createTestOwner, createTestGame } from './helpers/test-fixtures';

const owner = await createTestOwner(request);
const game = await createTestGame(request, owner.token, {
  priceCents: 700,
  state: 'active',
});
```

### Fail-Fast Pattern

```typescript
test.beforeAll(() => {
  assertLiveWebEnv(); // Throws if env not set
});

test('test case', async ({ page }) => {
  // Test implementation
});
```

## Known Limitations

1. **Payment Integration**: Tests use API mocks for Square payments. Full E2E payment flow requires Square sandbox credentials.

2. **MFA Tests**: Admin MFA tests require `TEST_ADMIN_MFA_SECRET` environment variable and TOTP token generation.

3. **Owner Login UI**: Owner login page (`/owners/login`) may not exist yet. Tests will skip if route returns 404.

4. **Stream Playback**: Video player tests verify UI elements exist but don't verify actual stream playback (requires active Mux stream).

## Next Steps

- [ ] Add QR scan flow tests (`02-viewer/qr-scan-flow.spec.ts`)
- [ ] Add playback tests (`02-viewer/playback.spec.ts`)
- [ ] Add owner dashboard tests (`04-owner/dashboard.spec.ts`)
- [ ] Add admin refund tests (`05-admin/manual-refund.spec.ts`)
- [ ] Add edge case tests (`06-edge-cases/*`)

See `docs/e2e-test-checklist.md` for full test plan.
