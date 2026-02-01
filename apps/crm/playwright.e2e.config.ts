import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const STORAGE_STATE = path.join(__dirname, 'tests/e2e/.auth-storage.json');

/**
 * E2E staging config — points at tests/e2e/ and assumes the app
 * is already running (no local webServer).
 *
 * Uses a global setup to login once and share auth state across all tests,
 * avoiding repeated login API calls and rate limiting.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '*.spec.ts',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 120 * 1000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://crm.quantract.co.uk',
    storageState: STORAGE_STATE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: false,
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
