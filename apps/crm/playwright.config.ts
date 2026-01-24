import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration optimized for Render CI/CD
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/playwright',
  
  // Maximum time one test can run (increased for CI)
  timeout: process.env.CI ? 90 * 1000 : 60 * 1000,
  
  // Test execution settings
  fullyParallel: false, // Run sequentially for stability
  forbidOnly: !!process.env.CI, // Fail build if test.only() left in code
  retries: process.env.CI ? 2 : 0, // Retry failed tests twice in CI
  workers: process.env.CI ? 1 : undefined, // Single worker in CI for stability
  
  // Reporter configuration
  reporter: process.env.CI 
    ? [
        ['list'], // Console output
        ['junit', { outputFile: 'test-results/junit.xml' }], // For CI systems
        ['html', { outputFolder: 'playwright-report', open: 'never' }], // HTML report
      ]
    : [
        ['html', { open: 'on-failure' }],
        ['list'],
      ],
  
  // Shared settings for all projects
  use: {
    // Base URL for your app
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Collect trace on first retry for debugging in CI
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    
    // Screenshot settings
    screenshot: 'only-on-failure',
    
    // Video settings (off in CI to save space)
    video: process.env.CI ? 'retain-on-failure' : 'off',
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // Ignore HTTPS errors (if needed for staging environments)
    ignoreHTTPSErrors: false,
    
    // Action timeout
    actionTimeout: 15 * 1000,
    
    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },

  // Configure projects for different browsers/devices
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Add any Chrome-specific settings
      },
    },
    
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['iPhone 13'],
        // Add any mobile-specific settings
      },
    },
    
    // Uncomment if you need Firefox or Safari testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting tests (disabled in CI)
  // In CI, your app should already be running
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
