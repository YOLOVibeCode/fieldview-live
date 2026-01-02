/**
 * Anonymous Viewer Access Tests
 * 
 * Tests that viewers can access watch/checkout pages without login.
 */

import { test, expect } from '@playwright/test';
import { assertLiveWebEnv, createTestOwner, createTestOrg, createTestChannel, cleanupTestData } from '../helpers/test-fixtures';

test.beforeAll(() => {
  assertLiveWebEnv();
});

test.afterAll(async ({ request }) => {
  await cleanupTestData(request);
});

test('VA-01: watch page loads without login', async ({ page, request }) => {
  // Arrange: Create test watch link (new style)
  const owner = await createTestOwner(request);
  const org = await createTestOrg(request, owner.token);
  const channel = await createTestChannel(request, owner.token, org.shortName, `anonteam${Date.now()}`, 'public_free');

  // Act: Navigate to watch page
  await page.goto(`/watch/${org.shortName}/${channel.teamSlug}`);

  // Assert: Page loads (no redirect to login)
  expect(page.url()).not.toContain('/login');
  expect(page.url()).not.toContain('/auth');
  await expect(page.getByTestId('card-watch-link')).toBeVisible();
});

test('VA-02: checkout page accessible without login', async ({ page, request }) => {
  // Arrange: Create test watch link with pay_per_view
  const owner = await createTestOwner(request);
  const org = await createTestOrg(request, owner.token);
  const channel = await createTestChannel(request, owner.token, org.shortName, `paidteam${Date.now()}`, 'pay_per_view', 500);

  // Act: Navigate to watch page (shows checkout for pay_per_view)
  await page.goto(`/watch/${org.shortName}/${channel.teamSlug}`);

  // Assert: Checkout form visible (no login required)
  await expect(page.getByTestId('form-checkout')).toBeVisible();
  await expect(page.getByLabel(/Email/i)).toBeVisible();
});

test('VA-03: no PII exposed in DOM', async ({ page, request }) => {
  // Arrange: Create test watch link
  const owner = await createTestOwner(request);
  const org = await createTestOrg(request, owner.token);
  const channel = await createTestChannel(request, owner.token, org.shortName, `piiteam${Date.now()}`, 'public_free');

  // Act: Navigate to watch page
  await page.goto(`/watch/${org.shortName}/${channel.teamSlug}`);

  // Wait for content to load
  await page.waitForLoadState('domcontentloaded');

  // Assert: No owner email/name visible in DOM
  const pageContent = await page.content();
  // owner.email is a unique email like e2e-test-1234567890@fieldview.test
  expect(pageContent.toLowerCase()).not.toContain(owner.email.toLowerCase());
});

