# URGENT FIX: Playwright on Render Without Root Access

## The Problem

Render doesn't allow root access, so `npx playwright install --with-deps chromium` fails.

## The Solution: Use Playwright Docker Image

You have **two options**:

---

## Option 1: Skip Browser Installation (Simplest)

Render's base Node.js image already has some browser dependencies. Try installing just the browsers without system deps:

### Update Your Build Command to:

```bash
npm ci && npx playwright install chromium && npm run build && npm run test:ci
```

**Note:** Removed `--with-deps` flag

This installs only the browser binary, not system dependencies. It works if Render's base image has enough dependencies.

---

## Option 2: Use Playwright Docker Image (Most Reliable)

Switch to a Dockerfile-based deployment with Playwright's official image.

### Create `Dockerfile` in your project root:

```dockerfile
# Use Playwright's official image (has all dependencies)
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Build your app
RUN npm run build

# Expose port
EXPOSE 3000

# Start command (will be overridden by Render)
CMD ["npm", "start"]
```

### Update Render Settings:

**In Render Dashboard:**
1. Go to your service settings
2. Change **Environment** from "Node" to "Docker"
3. **Build Command:** (leave empty or use default)
4. **Start Command:** 
   ```bash
   npm start
   ```
5. Set **Dockerfile Path:** `Dockerfile`

**Environment Variables:**
- `PORT` = `3000` (Render sets this automatically)
- `NODE_ENV` = `production`

### Now tests will run INSIDE the Docker build:

Update your `Dockerfile` to run tests during build:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build
RUN npm run build

# Run tests during Docker build
RUN npm run test:ci

EXPOSE 3000
CMD ["npm", "start"]
```

---

## Option 3: Skip Tests in Build, Run on Deploy (Alternative)

If you want tests to run but not block deployment:

### Update Build Command:
```bash
npm ci && npm run build
```

### Update Start Command:
```bash
npm run test:ci || echo "Tests failed but continuing" && npm start
```

This runs tests but doesn't fail the deployment if they fail.

---

## Recommended Approach for Render

**I recommend Option 1 first (simplest):**

### 1. Update Build Command in Render:
```bash
npm ci && npx playwright install chromium && npm run build && npm run test:ci
```

### 2. Update `playwright.config.ts`:

Add this at the top:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright',
  timeout: process.env.CI ? 90 * 1000 : 60 * 1000,
  
  // CI settings
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker
  
  // Skip browser installation check
  globalSetup: undefined,
  
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off', // Disable video in CI to save resources
    
    // Use installed chromium
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### 3. Test Locally First

Simulate Render environment:

```bash
# Remove existing browsers
rm -rf ~/.cache/ms-playwright

# Install without deps (like Render will)
npx playwright install chromium

# Run tests
npm run test:ci
```

If this works locally, it should work on Render.

---

## If Option 1 Doesn't Work

Use **Option 2 (Docker)** - it's the most reliable because Playwright's official Docker image has everything pre-installed.

---

## Quick Comparison

| Option | Pros | Cons |
|--------|------|------|
| Option 1 | Simplest, no Dockerfile needed | Might fail if Render's base image lacks dependencies |
| Option 2 | Most reliable, official support | Need to create Dockerfile, slower builds |
| Option 3 | Never blocks deployment | Tests might fail silently |

---

## Next Steps

1. **Try Option 1** - update build command to remove `--with-deps`
2. **If that fails** - switch to Option 2 with Dockerfile
3. **Check build logs** to see specific errors

Let me know which option you want to try and I'll help you implement it! 🚀
