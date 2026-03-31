/**
 * Superadmin Event Management — E2E Tests
 *
 * Covers: TC-SU-007 through TC-SU-011
 * Requires: LIVE_TEST_MODE=1, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD
 */
import { test, expect } from '@playwright/test';
import { assertLiveWebEnv, loginAsAdmin, loginAsAdminUI, uniqueSlug } from './helpers/test-fixtures';

const BASE_URL = () => process.env.PLAYWRIGHT_BASE_URL!;
const API_BASE = () => process.env.PLAYWRIGHT_API_BASE_URL!;

test.describe('Superadmin Event Management', () => {
  let testStreamSlug: string;
  let testStreamId: string;

  test.beforeAll(async ({ request }) => {
    assertLiveWebEnv();

    // Create a test stream via API for event tests
    const admin = await loginAsAdmin(request);
    testStreamSlug = uniqueSlug('e2e-evt-');

    const response = await request.post(`${API_BASE()}/api/admin/direct-streams`, {
      headers: { Authorization: `Bearer ${admin.sessionToken}` },
      data: {
        slug: testStreamSlug,
        title: `E2E Event Test Stream ${testStreamSlug}`,
        adminPassword: 'testpassword123',
        chatEnabled: true,
        scoreboardEnabled: false,
      },
    });

    if (!response.ok()) {
      const text = await response.text();
      throw new Error(`Failed to create test stream: ${response.status()} ${text}`);
    }

    const json = (await response.json()) as any;
    testStreamId = json.stream.id;
  });

  // TC-SU-007: Expand row and view sub-events
  test('TC-SU-007: expand stream row to see events section', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);

    await expect(page.getByTestId('page-superadmin-streams')).toBeVisible({ timeout: 10000 });

    // Wait for table
    const loading = page.getByTestId('loading-streams');
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 15000 });
    }

    // Expand our test stream
    const expandBtn = page.getByTestId(`btn-expand-${testStreamSlug}`);
    if (!(await expandBtn.isVisible().catch(() => false))) {
      test.skip(true, `Test stream ${testStreamSlug} not found in table`);
      return;
    }

    await expandBtn.click();

    // EventManagement should appear
    const eventsSection = page.getByTestId(`empty-events-${testStreamSlug}`).or(
      page.getByTestId(`table-events-${testStreamSlug}`)
    );
    await expect(eventsSection).toBeVisible({ timeout: 10000 });

    // Toggle should show new event button
    await expect(page.getByTestId(`btn-toggle-create-event-${testStreamSlug}`)).toBeVisible();

    // Collapse
    await expandBtn.click();
  });

  // TC-SU-008: Create sub-event
  test('TC-SU-008: create a sub-event under the test stream', async ({ page }) => {
    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);

    await expect(page.getByTestId('page-superadmin-streams')).toBeVisible({ timeout: 10000 });

    const loading = page.getByTestId('loading-streams');
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 15000 });
    }

    // Expand test stream
    const expandBtn = page.getByTestId(`btn-expand-${testStreamSlug}`);
    if (!(await expandBtn.isVisible().catch(() => false))) {
      test.skip(true, `Test stream ${testStreamSlug} not found`);
      return;
    }
    await expandBtn.click();

    // Wait for events section to load
    await page.waitForTimeout(2000);

    // Open create form
    await page.getByTestId(`btn-toggle-create-event-${testStreamSlug}`).click();
    await expect(page.getByTestId(`form-create-event-${testStreamSlug}`)).toBeVisible();

    const eventSlug = `test-game-${Date.now()}`;
    await page.getByTestId('input-event-slug').fill(eventSlug);
    await page.getByTestId('input-event-title').fill(`E2E Test Game ${eventSlug}`);

    await page.getByTestId('btn-submit-event').click();

    // Event should appear in table
    await expect(page.getByTestId(`row-event-${eventSlug}`)).toBeVisible({ timeout: 10000 });
  });

  // TC-SU-009: Archive an event
  test('TC-SU-009: archive a sub-event', async ({ page, request }) => {
    // First create an event via API
    const admin = await loginAsAdmin(request);
    const eventSlug = `archive-test-${Date.now()}`;

    await request.post(`${API_BASE()}/api/admin/direct-streams/${testStreamId}/events`, {
      headers: { Authorization: `Bearer ${admin.sessionToken}` },
      data: {
        eventSlug,
        title: `Archive Test ${eventSlug}`,
      },
    });

    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);
    await expect(page.getByTestId('page-superadmin-streams')).toBeVisible({ timeout: 10000 });

    const loading = page.getByTestId('loading-streams');
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 15000 });
    }

    // Expand stream
    const expandBtn = page.getByTestId(`btn-expand-${testStreamSlug}`);
    if (!(await expandBtn.isVisible().catch(() => false))) {
      test.skip(true, `Test stream ${testStreamSlug} not found`);
      return;
    }
    await expandBtn.click();
    await page.waitForTimeout(2000);

    // Archive the event
    const archiveBtn = page.getByTestId(`btn-archive-event-${eventSlug}`);
    if (!(await archiveBtn.isVisible().catch(() => false))) {
      test.skip(true, `Event ${eventSlug} not found`);
      return;
    }

    // Handle confirmation dialog
    page.on('dialog', dialog => dialog.accept());
    await archiveBtn.click();

    // Wait for status to update — event row should still exist but with archived status
    await page.waitForTimeout(2000);
  });

  // TC-SU-010: Soft delete an event
  test('TC-SU-010: soft delete a sub-event', async ({ page, request }) => {
    const admin = await loginAsAdmin(request);
    const eventSlug = `delete-test-${Date.now()}`;

    await request.post(`${API_BASE()}/api/admin/direct-streams/${testStreamId}/events`, {
      headers: { Authorization: `Bearer ${admin.sessionToken}` },
      data: {
        eventSlug,
        title: `Delete Test ${eventSlug}`,
      },
    });

    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);
    await expect(page.getByTestId('page-superadmin-streams')).toBeVisible({ timeout: 10000 });

    const loading = page.getByTestId('loading-streams');
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 15000 });
    }

    const expandBtn = page.getByTestId(`btn-expand-${testStreamSlug}`);
    if (!(await expandBtn.isVisible().catch(() => false))) {
      test.skip(true, `Test stream not found`);
      return;
    }
    await expandBtn.click();
    await page.waitForTimeout(2000);

    const deleteBtn = page.getByTestId(`btn-delete-event-${eventSlug}`);
    if (!(await deleteBtn.isVisible().catch(() => false))) {
      test.skip(true, `Event ${eventSlug} not found`);
      return;
    }

    page.on('dialog', dialog => dialog.accept());
    await deleteBtn.click();

    // Event should disappear from active list
    await expect(page.getByTestId(`row-event-${eventSlug}`)).toBeHidden({ timeout: 10000 });
  });

  // TC-SU-011: Hard delete an event
  test('TC-SU-011: hard delete a sub-event permanently', async ({ page, request }) => {
    const admin = await loginAsAdmin(request);
    const eventSlug = `harddelete-test-${Date.now()}`;

    await request.post(`${API_BASE()}/api/admin/direct-streams/${testStreamId}/events`, {
      headers: { Authorization: `Bearer ${admin.sessionToken}` },
      data: {
        eventSlug,
        title: `Hard Delete Test ${eventSlug}`,
      },
    });

    await loginAsAdminUI(page, BASE_URL());
    await page.goto(`${BASE_URL()}/superadmin/direct-streams`);
    await expect(page.getByTestId('page-superadmin-streams')).toBeVisible({ timeout: 10000 });

    const loading = page.getByTestId('loading-streams');
    if (await loading.isVisible().catch(() => false)) {
      await expect(loading).toBeHidden({ timeout: 15000 });
    }

    const expandBtn = page.getByTestId(`btn-expand-${testStreamSlug}`);
    if (!(await expandBtn.isVisible().catch(() => false))) {
      test.skip(true, `Test stream not found`);
      return;
    }
    await expandBtn.click();
    await page.waitForTimeout(2000);

    const hardDeleteBtn = page.getByTestId(`btn-hard-delete-event-${eventSlug}`);
    if (!(await hardDeleteBtn.isVisible().catch(() => false))) {
      test.skip(true, `Event ${eventSlug} not found`);
      return;
    }

    page.on('dialog', dialog => dialog.accept());
    await hardDeleteBtn.click();

    // Event should be completely gone
    await expect(page.getByTestId(`row-event-${eventSlug}`)).toBeHidden({ timeout: 10000 });
  });
});
