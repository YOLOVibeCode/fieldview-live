/**
 * Production E2E test config.
 * Runs all tests against https://fieldview.live across all 7 browser projects.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: 'list',
  timeout: 60000,

  use: {
    baseURL: 'https://fieldview.live',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Desktop
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    // Mobile
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    // Tablet
    { name: 'tablet-safari', use: { ...devices['iPad (gen 7)'] } },
    { name: 'tablet-safari-landscape', use: { ...devices['iPad (gen 7) landscape'] } },
  ],
});
