/**
 * Smoke Tests — Fail-Fast Gate
 * 
 * These tests run first and must pass before other suites execute.
 * If any smoke test fails, skip remaining tests.
 */

import { test, expect } from '@playwright/test';
import { assertLiveWebEnv, cleanupTestData } from './helpers/test-fixtures';

// Fail-fast: if smoke fails, skip remaining suites
test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  assertLiveWebEnv();
});

test.afterAll(async ({ request }) => {
  // Cleanup test data after all smoke tests
  await cleanupTestData(request);
});

test('SM-01: home page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/FieldView/i);
  // Verify heading is visible (accessibility-first selector)
  await expect(page.getByRole('heading', { name: /FieldView/i })).toBeVisible();
});

test('SM-02: API health endpoint returns 200', async ({ request }) => {
  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:4301';
  const response = await request.get(`${apiBase}/health`);

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe('healthy');
  expect(body.timestamp).toBeDefined();
});

test('SM-03: database connected', async ({ request }) => {
  const apiBase = process.env.PLAYWRIGHT_API_BASE_URL || 'http://localhost:4301';
  const response = await request.get(`${apiBase}/health`);

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.checks.database.status).toBe('ok');
});

test('SM-04: static assets load', async ({ page }) => {
  await page.goto('/');
  
  // Wait for page to fully load
  await page.waitForLoadState('networkidle');
  
  // Check that CSS/JS bundles loaded (no 404s for main assets)
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  
  // Verify no critical asset failures
  const failures: string[] = [];
  page.on('response', (response) => {
    const url = response.url();
    if (
      (url.includes('.css') || url.includes('.js')) &&
      response.status() >= 400
    ) {
      failures.push(url);
    }
  });
  
  // Re-navigate to capture asset requests
  await page.reload();
  await page.waitForLoadState('networkidle');
  
  // Allow some failures (e.g., analytics, external scripts) but not critical ones
  const criticalFailures = failures.filter(
    (url) => !url.includes('analytics') && !url.includes('external')
  );
  expect(criticalFailures.length).toBe(0);
});

