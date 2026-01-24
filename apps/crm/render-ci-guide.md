# Running Playwright Tests on Render - Complete Guide

## Overview

You have 13 passing Playwright tests locally. To run them on Render, you need to:
1. Install Playwright browsers in your Docker/build environment
2. Configure Playwright for headless CI mode
3. Set up your test script in package.json
4. Configure Render build/test commands
5. Handle environment-specific issues

---

## Step 1: Playwright Configuration for CI

### Create/Update `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/playwright',
  
  // Maximum time one test can run
  timeout: 60 * 1000,
  
  // CI-specific settings
  fullyParallel: !process.env.CI, // Sequential in CI for stability
  forbidOnly: !!process.env.CI,  // Fail if test.only() in CI
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: process.env.CI ? 1 : undefined, // Single worker in CI
  
  // Reporter configuration
  reporter: process.env.CI 
    ? [
        ['html', { outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['list']
      ]
    : [['html'], ['list']],
  
  // Shared settings for all projects
  use: {
    // Base URL - use environment variable or default
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Collect trace on first retry for debugging
    trace: process.env.CI ? 'on-first-retry' : 'on',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Viewport
    viewport: { width: 1280, height: 720 },
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment if needed:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    {
      name: 'mobile-chrome',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // Web server - start your app before tests
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

---

## Step 2: Update package.json Scripts

```json
{
  "scripts": {
    "dev": "your-dev-command",
    "build": "your-build-command",
    "start": "your-start-command",
    
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:debug": "playwright test --debug",
    "test:ui": "playwright test --ui",
    "test:report": "playwright show-report",
    
    "test:ci": "playwright test --reporter=html,junit",
    "test:ci:headed": "PLAYWRIGHT_HEADLESS=false playwright test"
  }
}
```

---

## Step 3: Install Playwright Dependencies

### For Docker-based Render Deployment

Create or update your `Dockerfile`:

```dockerfile
FROM node:18-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    # Chromium dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    # Additional utils
    wget \
    ca-certificates \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browsers
RUN npx playwright install --with-deps chromium

# Copy app files
COPY . .

# Build your app
RUN npm run build

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
```

### For Native Render Build (No Docker)

Add to your Render **Build Command**:

```bash
npm ci && npx playwright install --with-deps chromium && npm run build
```

---

## Step 4: Render Configuration

### Option A: Run Tests as Part of Build (Recommended)

**Render Settings:**
- **Build Command**: 
  ```bash
  npm ci && npx playwright install --with-deps chromium && npm run build && npm run test:ci
  ```
- **Start Command**: 
  ```bash
  npm start
  ```

**Environment Variables:**
```
NODE_ENV=production
CI=true
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### Option B: Separate Test Service

Create a separate Render service just for running tests:

**Service Type**: Background Worker

**Build Command**:
```bash
npm ci && npx playwright install --with-deps chromium
```

**Start Command**:
```bash
npm start & sleep 10 && npm run test:ci
```

**Environment Variables:**
```
NODE_ENV=test
CI=true
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

---

## Step 5: Handle CI-Specific Issues

### Issue 1: Tests Need Database

Make sure your test database is seeded before tests run:

```json
{
  "scripts": {
    "test:ci": "npm run db:seed:test && playwright test"
  }
}
```

### Issue 2: Flaky Tests in CI

Update your helper functions for better retry logic:

```typescript
// In _helpers.ts
export async function loginAs(ctx: ReqLike, role: Role, email?: string) {
  const targetEmail = email || (role === "admin" ? "admin@demo.quantract" : `${role}@demo.quantract`);
  const password = "Password123!";
  const request = isPage(ctx) ? ctx.request : ctx;

  // Add retry logic for CI
  let lastError;
  const maxRetries = process.env.CI ? 3 : 1;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await request.post("/api/auth/password/login", {
        data: { role, email: targetEmail, password },
      });

      const body = await res.text().catch(() => "");
      expect(res.ok(), `Login failed: ${res.status()} ${body}`).toBeTruthy();

      // ... rest of login logic
      return res;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        console.log(`Login attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
}
```

### Issue 3: Port Conflicts

Make sure your app uses the PORT environment variable:

```typescript
// In your server file
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Step 6: GitHub Actions (Optional but Recommended)

If you're using GitHub, add CI tests before deploying to Render:

`.github/workflows/playwright.yml`:

```yaml
name: Playwright Tests

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - uses: actions/setup-node@v3
      with:
        node-version: 18
        
    - name: Install dependencies
      run: npm ci
      
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps chromium
      
    - name: Run Playwright tests
      run: npm run test:ci
      env:
        CI: true
        PLAYWRIGHT_BASE_URL: http://localhost:3000
        
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

---

## Step 7: Monitor Test Results

### Save Test Artifacts on Render

Update your test script to save reports:

```json
{
  "scripts": {
    "test:ci": "playwright test --reporter=html,junit && mkdir -p /opt/render/project/reports && cp -r playwright-report/* /opt/render/project/reports/"
  }
}
```

### Check Render Logs

After deployment, check logs for:
```
✓ All tests passed (13/13)
```

Or look for failures:
```
✗ Test failed: 09-client-flow-mobile
```

---

## Step 8: Troubleshooting Common Issues

### Issue: "Executable doesn't exist at /path/to/chromium"

**Solution**: Make sure Playwright browsers are installed in build:
```bash
npx playwright install --with-deps chromium
```

### Issue: "net::ERR_CONNECTION_REFUSED"

**Solution**: Your app isn't running. Update start command:
```bash
npm start & sleep 10 && npm run test:ci
```

### Issue: "Timeout waiting for element"

**Solution**: Increase timeouts for CI:
```typescript
// In playwright.config.ts
timeout: process.env.CI ? 90 * 1000 : 60 * 1000,
```

### Issue: Tests pass locally but fail on Render

**Solution**: 
1. Check environment variables are set correctly
2. Ensure database is seeded
3. Check if test data exists
4. Review Render logs for specific errors

---

## Step 9: Best Practices for CI

### 1. Test Data Management
```typescript
// Create fresh test data for each test
test.beforeEach(async () => {
  await resetTestDatabase();
  await seedTestUsers();
});
```

### 2. Parallel Execution
```typescript
// In playwright.config.ts
workers: process.env.CI ? 1 : 3, // Sequential in CI for stability
```

### 3. Screenshot on Failure
Tests already configured to save screenshots on failure - check Render logs.

### 4. Database Cleanup
```typescript
test.afterAll(async () => {
  await cleanupTestData();
});
```

---

## Step 10: Verify It Works

### Local CI Simulation

Test your CI setup locally:

```bash
# Set CI environment
export CI=true
export PLAYWRIGHT_BASE_URL=http://localhost:3000

# Start your app
npm start &

# Wait for it to be ready
sleep 10

# Run tests
npm run test:ci

# Check results
echo $? # Should be 0 if all passed
```

### On Render

1. Push your changes to GitHub
2. Render will auto-deploy
3. Check build logs for test results
4. If tests fail, build fails (if configured that way)

---

## Summary Checklist

- [ ] `playwright.config.ts` configured for CI
- [ ] `package.json` has `test:ci` script
- [ ] Dockerfile or build command installs Playwright browsers
- [ ] Environment variables set on Render
- [ ] Database seeding configured (if needed)
- [ ] Retry logic added to flaky operations
- [ ] Tests run successfully in local CI mode
- [ ] Render build command includes test execution
- [ ] Test reports are viewable (optional)

---

## Example: Complete Render Setup

**Build Command:**
```bash
npm ci && npx playwright install --with-deps chromium && npm run build && npm run test:ci
```

**Start Command:**
```bash
npm start
```

**Environment Variables:**
```
NODE_ENV=production
CI=true
PLAYWRIGHT_BASE_URL=http://localhost:3000
DATABASE_URL=your-database-url
```

With this setup, every deployment to Render will:
1. Install dependencies
2. Install Playwright browsers
3. Build your app
4. Run all 13 tests
5. Only deploy if tests pass ✅

---

## Need Help?

If tests fail on Render:
1. Check Render logs for specific error
2. Run `CI=true npm run test:ci` locally to simulate
3. Verify environment variables are set
4. Check that database is accessible
5. Ensure test users exist in production/staging DB

Good luck! 🚀
