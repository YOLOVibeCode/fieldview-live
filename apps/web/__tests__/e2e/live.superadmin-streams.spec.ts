/**
 * Superadmin Direct Streams Console — E2E Tests
 *
 * Covers: TC-SU-001 through TC-SU-006
 * Requires: LIVE_TEST_MODE=1, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 */
import { test, expect } from '@playwright/test';
import { assertLiveWebEnv, loginAsAdminUI, uniqueSlug } from './helpers/test-fixtures';

const BASE_URL = () => process.env.PLAYWRIGHT_BASE_URL!;

test.describe('Superadmin Direct Streams Console', () => {
  test.beforeEach(async () => {
    assertLiveWebEnv();
  });

  // TC-SU-001: Direct streams inventory loads
  test('TC-SU-001: streams table loads with data', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);

    await expect(page.getByTestId('page-superadmin-streams')).toBeVisible({ timeout: 10000 });

    // Wait for loading to finish
    const loading = page.getByTestId('loading-streams');
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 15000 });
    }

    // Either table or empty state should be visible
    const table = page.getByTestId('table-streams');
    const empty = page.getByTestId('empty-streams');
    const hasTable = await table.isVisible().catch(() => false);
    const hasEmpty = await empty.isVisible().catch(() => false);
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  // TC-SU-003: Filter streams by status
  test('TC-SU-003: filter streams by status dropdown', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);

    await expect(page.getByTestId('page-superadmin-streams')).toBeVisible({ timeout: 10000 });

    const statusFilter = page.getByTestId('select-status-filter');
    await expect(statusFilter).toBeVisible();

    // Default should be Active
    // Switch to Archived
    await statusFilter.selectOption('archived');
    await page.waitForTimeout(1000);

    // Table or empty state should still render (no crash)
    const table = page.getByTestId('table-streams');
    const empty = page.getByTestId('empty-streams');
    const hasContent = await table.isVisible().catch(() => false) || await empty.isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();

    // Switch to Deleted
    await statusFilter.selectOption('deleted');
    await page.waitForTimeout(1000);

    const hasContent2 = await table.isVisible().catch(() => false) || await empty.isVisible().catch(() => false);
    expect(hasContent2).toBeTruthy();

    // Switch back to Active
    await statusFilter.selectOption('active');
    await page.waitForTimeout(1000);
  });

  // TC-SU-002: Create DirectStream via form
  test('TC-SU-002: create new stream via drawer form', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);

    await expect(page.getByTestId('page-superadmin-streams')).toBeVisible({ timeout: 10000 });

    // Open create drawer
    await page.getByTestId('btn-create-stream').click();
    await expect(page.getByTestId('drawer-create-stream')).toBeVisible();

    const slug = uniqueSlug('e2e-test-');
    await page.getByTestId('input-slug').fill(slug);
    await page.getByTestId('input-title').fill(`E2E Test Stream ${slug}`);
    await page.getByTestId('input-admin-password').fill('testpassword123');

    // Submit
    await page.getByTestId('btn-submit-create').click();

    // Drawer should close on success
    await expect(page.getByTestId('drawer-create-stream')).toBeHidden({ timeout: 10000 });

    // New stream should appear in table
    await expect(page.getByTestId(`link-stream-${slug}`)).toBeVisible({ timeout: 5000 });
  });

  // TC-SU-006: Create stream validation errors
  test('TC-SU-006: create form shows validation errors for bad input', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);

    await expect(page.getByTestId('page-superadmin-streams')).toBeVisible({ timeout: 10000 });

    await page.getByTestId('btn-create-stream').click();
    await expect(page.getByTestId('drawer-create-stream')).toBeVisible();

    // Submit empty form
    await page.getByTestId('btn-submit-create').click();

    // Validation errors should appear
    await expect(page.getByTestId('error-slug')).toBeVisible({ timeout: 3000 });

    // Enter invalid slug (uppercase)
    await page.getByTestId('input-slug').fill('BAD SLUG!');
    await page.getByTestId('input-title').fill('Test');
    await page.getByTestId('input-admin-password').fill('short');
    await page.getByTestId('btn-submit-create').click();

    // Password error (too short)
    await expect(page.getByTestId('error-admin-password')).toBeVisible({ timeout: 3000 });

    // Cancel should close and reset
    await page.getByTestId('btn-close-create').click();
    await expect(page.getByTestId('drawer-create-stream')).toBeHidden();
  });

  // TC-SU-005: View registrations modal
  test('TC-SU-005: registrations modal opens and closes', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);

    await expect(page.getByTestId('page-superadmin-streams')).toBeVisible({ timeout: 10000 });

    // Wait for table to load
    const loading = page.getByTestId('loading-streams');
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 15000 });
    }

    // Find any registrations link — they match btn-registrations-{slug}
    const regButtons = page.locator('[data-testid^="btn-registrations-"]');
    const count = await regButtons.count();

    if (count === 0) {
      test.skip(true, 'No streams with registrations links to test');
      return;
    }

    await regButtons.first().click();
    await expect(page.getByTestId('modal-registrations')).toBeVisible({ timeout: 5000 });

    // Close modal
    await page.getByTestId('btn-close-registrations').click();
    await expect(page.getByTestId('modal-registrations')).toBeHidden();
  });

  // TC-SU-004: Impersonate stream admin
  test('TC-SU-004: impersonate generates token and opens stream', async ({ page, context }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);

    await expect(page.getByTestId('page-superadmin-streams')).toBeVisible({ timeout: 10000 });

    // Wait for table
    const loading = page.getByTestId('loading-streams');
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 15000 });
    }

    const impersonateButtons = page.locator('[data-testid^="btn-impersonate-"]');
    const count = await impersonateButtons.count();

    if (count === 0) {
      test.skip(true, 'No streams available for impersonation');
      return;
    }

    // Listen for new tab
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      impersonateButtons.first().click(),
    ]);

    // New tab should open to a stream page
    await newPage.waitForLoadState('domcontentloaded');
    expect(newPage.url()).toMatch(/\/direct\//);

    await newPage.close();
  });
});
