import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Support both local e2e tests and root-level tests
  testDir: './__tests__/e2e',
  testMatch: ['**/*.spec.ts', '../../tests/e2e/**/*.spec.ts'],
  fullyParallel: false, // Run tests sequentially for chat (avoid conflicts)
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // One worker for chat tests to avoid race conditions
  reporter: 'html',
  
  use: {
    baseURL: process.env.WEB_URL || 'http://localhost:4300',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Run local dev servers before tests
  webServer: [
    {
      command: 'cd ../api && pnpm dev',
      url: 'http://localhost:4301/health',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:4300',
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
