# Testing Strategy & E2E

## Overview

Comprehensive testing strategy with unit, integration, contract, and end-to-end tests. **100% test coverage** required.

## Testing Pyramid

```
        /\
       /E2E\        (Few, critical paths)
      /------\
     /Integration\   (API endpoints, services)
    /------------\
   /    Unit      \  (Many, all functions)
  /----------------\
```

## Unit Tests

### Scope

- **Services**: Business logic, calculations
- **Utilities**: Pure functions (masking, fee calculator)
- **Repositories**: Data access logic (mocked DB)
- **Middleware**: Auth, validation, rate limiting
- **Components**: React components (React Testing Library)

### Tools

- **Vitest**: Test runner (faster than Jest)
- **React Testing Library**: Component testing
- **@testing-library/user-event**: User interaction simulation

### Coverage Requirement

**100% coverage** enforced in CI.

**Example**:
```typescript
// packages/data-model/__tests__/unit/utils/masking.test.ts
import { describe, it, expect } from 'vitest';
import { maskEmail } from '@/utils/masking';

describe('maskEmail', () => {
  it('masks email correctly', () => {
    expect(maskEmail('john@example.com')).toBe('j***@example.com');
    expect(maskEmail('a@example.com')).toBe('***@example.com');
  });
  
  it('handles invalid email', () => {
    expect(maskEmail('invalid')).toBe('***@***');
  });
});
```

## Integration Tests

### Scope

- **API Routes**: End-to-end request/response
- **Database Operations**: Real Postgres (test DB)
- **Webhook Handlers**: Mock external services
- **Service Integration**: Multiple services working together

### Tools

- **Supertest**: HTTP assertions
- **Test Containers**: Docker containers for Postgres/Redis
- **Nock**: HTTP mocking (for external APIs)

### Setup

```typescript
// apps/api/__tests__/integration/setup.ts
import { beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

let postgresContainer: PostgreSqlContainer;

beforeAll(async () => {
  postgresContainer = await new PostgreSqlContainer().start();
  process.env.DATABASE_URL = postgresContainer.getConnectionUri();
  
  // Run migrations
  await exec('pnpm db:migrate');
});

afterAll(async () => {
  await postgresContainer.stop();
});
```

### Example

```typescript
// apps/api/__tests__/integration/routes/public.test.ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '@/server';

describe('POST /api/public/games/:gameId/checkout', () => {
  it('creates checkout with required email', async () => {
    const game = await createTestGame();
    
    const response = await request(app)
      .post(`/api/public/games/${game.id}/checkout`)
      .send({
        viewerEmail: 'test@example.com',
      })
      .expect(200);
    
    expect(response.body).toHaveProperty('purchaseId');
    expect(response.body).toHaveProperty('watchToken');
  });
  
  it('rejects checkout without email', async () => {
    const game = await createTestGame();
    
    await request(app)
      .post(`/api/public/games/${game.id}/checkout`)
      .send({})
      .expect(400);
  });
});
```

## Contract Tests

### Purpose

Ensure API implementation matches OpenAPI specification.

### Tools

- **openapi-validator**: Validate request/response shapes
- **Dredd**: Test API against OpenAPI spec

### Implementation

```typescript
// apps/api/__tests__/contract/api.test.ts
import { describe, it } from 'vitest';
import { validateRequest, validateResponse } from 'openapi-validator';
import { openapiSpec } from '../../../openapi/api.yaml';

describe('Contract Tests', () => {
  it('POST /api/public/games/{gameId}/checkout matches OpenAPI', async () => {
    const request = {
      viewerEmail: 'test@example.com',
    };
    
    // Validate request
    validateRequest(openapiSpec, '/public/games/{gameId}/checkout', 'post', request);
    
    // Make request
    const response = await api.post('/api/public/games/123/checkout', request);
    
    // Validate response
    validateResponse(openapiSpec, '/public/games/{gameId}/checkout', 'post', response.body);
  });
});
```

## End-to-End Tests (Playwright)

### Scope

**Golden Paths** (from `docs/02-user-flows.md`):
1. **Text-to-Pay Flow**: SMS → payment → watch
2. **QR-to-Pay Flow**: QR scan → payment → watch
3. **Owner Game Creation**: Create game with each StreamSource type
4. **Owner Audience View**: View audience with masked emails
5. **Admin Search**: Search by email → view purchase → view audience
6. **Refund Flow**: Simulate bad telemetry → verify refund

### Tools

- **Playwright**: Browser automation
- **@playwright/test**: Test framework

### Setup

```typescript
// apps/web/__tests__/e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Example: Text-to-Pay Flow

```typescript
// apps/web/__tests__/e2e/text-to-pay.test.ts
import { test, expect } from '@playwright/test';

test('Text-to-Pay Flow', async ({ page }) => {
  // 1. Simulate inbound SMS (via API)
  const game = await createTestGame({ keywordCode: 'EAGLES22' });
  await simulateInboundSMS('+15551234567', 'EAGLES22');
  
  // 2. Navigate to checkout (from SMS link)
  await page.goto(`/checkout/${game.id}`);
  
  // 3. Fill checkout form (email required)
  await page.fill('[name="viewerEmail"]', 'test@example.com');
  await page.fill('[name="viewerPhone"]', '+15551234567');
  
  // 4. Submit checkout
  await page.click('button[type="submit"]');
  
  // 5. Complete Square payment (mock)
  await mockSquarePayment(page, { success: true });
  
  // 6. Verify redirect to watch page
  await expect(page).toHaveURL(/\/watch\/.+/);
  
  // 7. Verify video player loads
  await expect(page.locator('video')).toBeVisible();
  
  // 8. Verify session created
  const session = await getPlaybackSessionFromDB();
  expect(session).toBeDefined();
});
```

### Example: Owner Audience View

```typescript
test('Owner Views Audience (Masked Emails)', async ({ page, context }) => {
  // Login as owner
  await loginAsOwner(page, context);
  
  // Navigate to game audience
  const game = await createTestGame();
  await page.goto(`/owner/games/${game.id}/audience`);
  
  // Verify purchasers table shows masked emails
  const emailCells = page.locator('table tbody td:first-child');
  await expect(emailCells.first()).toContainText('***@');
  
  // Verify watchers table shows session counts
  const sessionCells = page.locator('table tbody td:nth-child(2)');
  await expect(sessionCells.first()).toMatch(/\d+/);
});
```

### Example: Admin Search (Full Emails)

```typescript
test('SuperAdmin Views Full Emails', async ({ page, context }) => {
  // Login as SuperAdmin
  await loginAsSuperAdmin(page, context);
  
  // Search by email
  await page.goto('/admin/console');
  await page.fill('[name="search"]', 'test@example.com');
  await page.click('button[type="submit"]');
  
  // Verify full email displayed
  await expect(page.locator('table tbody')).toContainText('test@example.com');
  
  // Navigate to purchase detail
  await page.click('table tbody tr:first-child');
  
  // Verify full email in purchase detail
  await expect(page.locator('[data-testid="viewer-email"]')).toContainText('test@example.com');
});
```

## Test Coverage Enforcement

### CI Integration

```yaml
# .github/workflows/ci.yml
- name: Run Tests
  run: |
    pnpm test:coverage
    
- name: Check Coverage
  run: |
    pnpm exec vitest --coverage --coverage.threshold.lines=100 --coverage.threshold.functions=100 --coverage.threshold.branches=100 --coverage.threshold.statements=100
```

### Coverage Reports

- **Vitest**: Built-in coverage (via `@vitest/coverage-v8`)
- **Coverage Threshold**: 100% for all metrics

## Performance Testing (Lightweight MVP)

### Targets

- SMS webhook: < 2s p95
- Watch bootstrap: < 5s p95
- Dashboard load: < 2s p95

### Tools

- **k6**: Load testing (optional for MVP)
- **Lighthouse CI**: Performance budgets

## Acceptance Tests

### Per Feature

Each feature (FR-1 through FR-9) has acceptance criteria defined in implementation docs. Tests verify these criteria.

**Example** (FR-3: Payments):
- [ ] Checkout requires `viewerEmail`
- [ ] Square payment created successfully
- [ ] Entitlement created on payment success
- [ ] Ledger entries created

## Test Data Management

### Fixtures

```typescript
// apps/api/__tests__/fixtures/game.ts
export function createTestGame(overrides?: Partial<Game>): Promise<Game> {
  return gameRepository.create({
    title: 'Test Game',
    homeTeam: 'Home',
    awayTeam: 'Away',
    startsAt: new Date(),
    priceCents: 1000,
    ...overrides,
  });
}
```

### Database Seeding

```typescript
// apps/api/__tests__/fixtures/seed.ts
export async function seedTestData() {
  const owner = await createTestOwner();
  const game = await createTestGame({ ownerAccountId: owner.id });
  return { owner, game };
}
```

## Acceptance Criteria

- [ ] Unit tests cover all services, utilities, middleware
- [ ] Integration tests cover all API endpoints
- [ ] Contract tests validate OpenAPI compliance
- [ ] E2E tests cover critical flows (text-to-pay, QR-to-pay, admin)
- [ ] 100% test coverage enforced in CI
- [ ] All tests pass before merge
- [ ] Performance targets met

## Next Steps

- Proceed to [14-railway-deployment.md](./14-railway-deployment.md) for deployment
