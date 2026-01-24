# Quick Start: Render + Playwright Setup

## FASTEST Way to Get Tests Running on Render

### 1. Update your `render.yaml` (if you have one):

```yaml
services:
  - type: web
    name: your-app-name
    env: node
    buildCommand: |
      npm ci
      npx playwright install --with-deps chromium
      npm run build
      npm run test:ci
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: CI
        value: true
      - key: PLAYWRIGHT_BASE_URL
        value: http://localhost:3000
```

### 2. Or Configure via Render Dashboard:

**Build Command:**
```bash
npm ci && npx playwright install --with-deps chromium && npm run build && npm run test:ci
```

**Start Command:**
```bash
npm start
```

**Environment Variables:**
- `CI` = `true`
- `NODE_ENV` = `production`
- `PLAYWRIGHT_BASE_URL` = `http://localhost:3000`

### 3. Add to your `package.json`:

```json
{
  "scripts": {
    "test:ci": "playwright test --reporter=list,junit"
  }
}
```

### 4. Create `playwright.config.ts` (if you don't have it):

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  timeout: 60 * 1000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['iPhone 13'] } },
  ],
});
```

That's it! Push and Render will run your tests on every deploy.

## If Tests Fail on Render

Check logs for the specific error, then:

1. **"Chromium not found"** → Make sure build command has `npx playwright install --with-deps chromium`
2. **"Connection refused"** → App isn't starting before tests. Add `sleep 10` before tests
3. **"401 Unauthorized"** → Environment variables not set correctly
4. **Timeout errors** → Increase timeout in playwright.config.ts to 90s for CI

## Test Locally in CI Mode

```bash
export CI=true
export PLAYWRIGHT_BASE_URL=http://localhost:3000
npm start &
sleep 10
npm run test:ci
```

This simulates Render's environment!
