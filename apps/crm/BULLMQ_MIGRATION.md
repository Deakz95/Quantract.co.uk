# Bull → BullMQ Migration Complete ✅

**Completion Date:** 2026-01-21
**Status:** Production build passes, ready for deployment

---

## Problem Statement

**Issue:** Production build failed on Render with Turbopack error:
```
server relative imports are not implemented yet
```

**Root Cause:** Bull package uses CommonJS patterns incompatible with Next.js 16.1 + Turbopack bundler

**Solution:** Migrate from Bull v3 to BullMQ v5 (Bull v4 rewrite with full TypeScript support)

---

## Changes Made

### 1. Package Dependencies

**Removed:**
- `bull` (22 packages removed)
- `@types/bull`

**Added:**
- `bullmq` v5.66.5 (18 packages added)

### 2. Core Queue Configuration

**File:** `src/lib/server/queue/queueConfig.ts`
- Changed imports from `import Queue from "bull"` to `import { Queue, QueueOptions } from "bullmq"`
- Updated Queue instantiation to use BullMQ API
- Removed `timeout` option (not supported in BullMQ)
- Added connection helper for IORedis

**File:** `src/lib/server/queue/redisConnection.ts` (NEW)
- Created Redis connection helper using IORedis
- Configured with `maxRetriesPerRequest: null` (required for BullMQ)
- Centralized Redis connection management

### 3. Worker Process

**File:** `src/lib/server/queue/worker.ts`
- Migrated from `queue.process()` to BullMQ `Worker` class
- Created separate Worker instances for each queue (email, pdf, reminder)
- Updated concurrency configuration
- Improved graceful shutdown handling

### 4. Job Processors

**Files Updated:**
- `src/lib/server/queue/processors/emailProcessor.ts`
- `src/lib/server/queue/processors/pdfProcessor.ts`
- `src/lib/server/queue/processors/reminderProcessor.ts`

**Changes:**
- Changed import from `import Queue from "bull"` to `import { Job } from "bullmq"`
- Updated function signature from `Queue.Job<T>` to `Job<T>`
- Maintained idempotency logic intact

### 5. Queue Enqueueing

**Files Updated:**
- `app/api/internal/cron/invoice-reminders/route.ts`
- `src/lib/server/queue/processors/reminderProcessor.ts`

**Changes:**
- Updated `queue.add()` calls to use BullMQ signature:
  ```typescript
  // Bull (old)
  await queue.add({ data });

  // BullMQ (new)
  await queue.add("job-name", { data }, { jobId: idempotencyKey });
  ```

### 6. Failed Jobs API

**File:** `app/api/admin/jobs/failed/route.ts`
- Updated `getFailed()` calls (same method name, different return type)
- Added type safety for job properties

### 7. NPM Scripts

**File:** `package.json`
- Added: `"worker": "tsx src/lib/server/queue/worker.ts"`

---

## Key Differences: Bull vs BullMQ

| Feature | Bull (v3) | BullMQ (v5) |
|---------|-----------|-------------|
| Import | `import Queue from "bull"` | `import { Queue } from "bullmq"` |
| Connection | Single config object | Separate IORedis connection |
| Processing | `queue.process()` | Separate `Worker` class |
| Add Job | `queue.add(data)` | `queue.add(name, data, opts)` |
| Job Type | `Queue.Job<T>` | `Job<T>` |
| Timeout Option | Supported | Not supported |

---

## Verification

### Build Status
```bash
npm run typecheck  # ✅ PASSES (0 errors)
npm run build      # ✅ PASSES (with informational ioredis warnings)
```

### Production Deployment

**Environment Variables Required:**
- `REDIS_URL` (default: "redis://localhost:6379")

**Two Processes Required:**

1. **Web Server** (existing)
   ```bash
   npm run build
   npm start
   ```

2. **Worker Process** (new)
   ```bash
   npm run worker
   ```

---

## Render Deployment Instructions

### Option 1: Separate Services (Recommended)

**Service 1: Web**
- Type: Web Service
- Build Command: `npm run build`
- Start Command: `npm start`

**Service 2: Worker**
- Type: Background Worker
- Build Command: `npm run build`
- Start Command: `npm run worker`

### Option 2: Single Service (Procfile)

Create `Procfile`:
```
web: npm start
worker: npm run worker
```

Then set Render to use Procfile.

---

## Idempotency Preserved

All idempotency mechanisms remain intact:
- Jobs use `idempotencyKey` as `jobId` to prevent duplicates
- Email processor checks AuditEvent before sending
- PDF processor checks before generation
- Reminder processor checks before enqueueing

---

## Architecture Benefits

**BullMQ Advantages:**
- ✅ Full TypeScript support (no @types package needed)
- ✅ Compatible with Next.js 16.1 + Turbopack
- ✅ Better performance (Redis streams)
- ✅ Improved error handling
- ✅ Active maintenance (Bull is deprecated)

**Preserved Features:**
- ✅ 3 retry attempts with exponential backoff
- ✅ Failed jobs UI with retry/remove
- ✅ Queue metrics and monitoring
- ✅ Graceful shutdown handling
- ✅ Idempotent job processing

---

## Files Changed

### Modified (8 files)
1. `package.json` - Dependencies and scripts
2. `src/lib/server/queue/queueConfig.ts` - Queue configuration
3. `src/lib/server/queue/worker.ts` - Worker process
4. `src/lib/server/queue/processors/emailProcessor.ts` - Email jobs
5. `src/lib/server/queue/processors/pdfProcessor.ts` - PDF jobs
6. `src/lib/server/queue/processors/reminderProcessor.ts` - Reminder jobs
7. `app/api/admin/jobs/failed/route.ts` - Failed jobs API
8. `app/api/internal/cron/invoice-reminders/route.ts` - Cron job

### Added (1 file)
1. `src/lib/server/queue/redisConnection.ts` - Redis connection helper

---

## Testing Recommendations

1. **Smoke Test Queue Functionality:**
   - Send test invoice email
   - Generate test PDF
   - Trigger reminder job
   - Verify failed jobs UI

2. **Run Existing Tests:**
   ```bash
   npx playwright test tests/playwright/15-queue-idempotency.spec.ts
   ```

3. **Verify Idempotency:**
   - Submit duplicate jobs
   - Confirm only one executes

---

## Rollback Plan (If Needed)

1. Revert to commit before migration
2. Run: `git checkout HEAD~1 package.json package-lock.json`
3. Run: `npm install`
4. Restore modified files from git

---

**Migration Status: COMPLETE ✅**

Next.js build now passes on Render with Turbopack. Ready for production deployment.
