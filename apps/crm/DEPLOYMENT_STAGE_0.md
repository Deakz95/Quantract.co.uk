# Stage 0 Deployment Guide

**CRITICAL:** Follow these steps in order before deploying Stage 0 to production.

---

## Prerequisites

```bash
# Ensure dependencies are installed
npm install

# Verify Prisma CLI is available
npx prisma --version
```

---

## Step 1: Generate Database Migration

```bash
# Generate migration (local development)
npx prisma migrate dev --name stage0_security_hardening

# This will:
# 1. Create a new migration file in prisma/migrations/
# 2. Apply it to your local database
# 3. Regenerate Prisma Client
```

**Expected Changes:**
- Add MFA fields to User table (mfaEnabled, mfaSecret, mfaBackupCodes, etc.)
- Create MfaSession table
- Create NotificationPreference table

---

## Step 2: Review Migration SQL

```bash
# Check the generated migration file
cat prisma/migrations/XXXXXX_stage0_security_hardening/migration.sql
```

**Expected SQL:**
```sql
-- AlterTable User
ALTER TABLE "User" ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "mfaSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaBackupCodes" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaEnrolledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "mfaVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "mfaRequiredBy" TIMESTAMP(3);

-- CreateTable MfaSession
CREATE TABLE "MfaSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "challengeToken" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "MfaSession_userId_status_idx" ON "MfaSession"("userId", "status");
CREATE INDEX "MfaSession_expiresAt_idx" ON "MfaSession"("expiresAt");

-- CreateTable NotificationPreference
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "NotificationPreference_userId_channel_category_idx" ON "NotificationPreference"("userId", "channel", "category");
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
```

---

## Step 3: Test Locally

```bash
# Start development server
npm run dev

# Run rate limiting smoke tests
npm run test:e2e -- e2e-rate-limiting.spec.ts

# Test auth endpoints manually:
# 1. Request magic link (should work for first 5, then rate limit)
# 2. Login with password (should work for first 10, then rate limit)
# 3. Verify Sentry logs appear (if SENTRY_DSN configured)
```

---

## Step 4: Deploy to Production

### 4.1 Set Environment Variables

**Required:**
```bash
SENTRY_DSN=https://...@sentry.io/...
RESEND_API_KEY=re_...
RESEND_FROM="Quantract <no-reply@yourdomain.com>"
DATABASE_URL=postgresql://...
APP_ORIGIN=https://yourdomain.com
NEXT_PUBLIC_APP_ORIGIN=https://yourdomain.com
```

**Optional (for source maps):**
```bash
SENTRY_AUTH_TOKEN=...
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
```

### 4.2 Apply Migration to Production

```bash
# Deploy migration to production database
npx prisma migrate deploy

# This will:
# 1. Connect to DATABASE_URL
# 2. Apply pending migrations
# 3. Exit with code 0 if successful
```

### 4.3 Deploy Application

```bash
# Render/Vercel will automatically:
# 1. Run npm install
# 2. Run npx prisma generate
# 3. Build Next.js app
# 4. Start production server

# Manual deployment (if needed):
npm run build
npm run start
```

---

## Step 5: Post-Deployment Verification

### 5.1 Check Database Schema

```sql
-- Connect to production database
psql $DATABASE_URL

-- Verify new tables exist
\dt MfaSession
\dt NotificationPreference

-- Verify User table has new columns
\d "User"
```

### 5.2 Test Rate Limiting

```bash
# Use curl to test magic link rate limiting
for i in {1..6}; do
  curl -X POST https://yourdomain.com/api/auth/magic-link/request \
    -H "Content-Type: application/json" \
    -d '{
      "role": "client",
      "email": "test@example.com",
      "rememberMe": false
    }'
  echo "\nRequest $i"
done

# Expected: First 5 succeed, 6th returns 429
```

### 5.3 Check Sentry

1. Go to Sentry dashboard
2. Verify errors are being captured
3. Check breadcrumbs for sensitive data scrubbing
4. Verify environment is set correctly (production/staging)

### 5.4 Check Structured Logs

```bash
# View production logs (Render/Vercel)
# Look for JSON-formatted log entries like:

{
  "timestamp": "2026-01-21T10:30:00Z",
  "level": "info",
  "category": "request",
  "route": "/api/auth/magic-link/request",
  "method": "POST",
  "status": 200,
  "durationMs": 123,
  "companyId": "...",
  "requestId": "..."
}
```

---

## Step 6: Smoke Test Critical Flows

### 6.1 Test Auth Flow

1. ✅ Request magic link → Check email arrives
2. ✅ Click magic link → Should login successfully
3. ✅ Logout → Session should be revoked
4. ✅ Try 6th magic link → Should be rate limited

### 6.2 Test Notification Preferences

1. ✅ Login as client
2. ✅ Go to notification preferences (future UI)
3. ✅ Opt-out of invoice emails
4. ✅ Send test invoice → Email should NOT be sent

### 6.3 Test MFA (Schema Only)

```javascript
// Run in Prisma Studio or DB console
const user = await prisma.user.findFirst({
  where: { email: 'admin@example.com' },
  select: {
    mfaEnabled: true,
    mfaSecret: true,
    mfaEnrolledAt: true,
  }
});

console.log(user);
// Should show: { mfaEnabled: false, mfaSecret: null, mfaEnrolledAt: null }
```

---

## Rollback Plan

### If Migration Fails

```bash
# Rollback to previous migration
npx prisma migrate resolve --rolled-back XXXXXX_stage0_security_hardening

# Or restore from database backup (preferred)
# Contact Neon support for point-in-time recovery
```

### If Application Errors

1. Check Sentry for stack traces
2. Review structured logs for errors
3. Verify environment variables are set
4. Check database connection
5. Rollback deployment if critical

---

## Success Criteria

✅ **Migration applied successfully**
- No errors in `npx prisma migrate deploy`
- New tables visible in database

✅ **Rate limiting works**
- 6th magic link request returns 429
- Retry-After header present

✅ **Sentry receives errors**
- Test error appears in Sentry dashboard
- Sensitive data is scrubbed

✅ **Structured logs appear**
- JSON-formatted logs in production
- RequestId, companyId, userId present

✅ **App functions normally**
- Login works
- Magic links work
- No regressions in existing features

---

## Troubleshooting

### Migration Fails with "column already exists"

**Cause:** Migration already applied or manual schema changes

**Fix:**
```bash
# Mark migration as applied without running
npx prisma migrate resolve --applied XXXXXX_stage0_security_hardening
```

### Prisma Client Out of Sync

**Cause:** Migration applied but client not regenerated

**Fix:**
```bash
npx prisma generate
npm run build
```

### Rate Limiting Not Working

**Cause:** In-memory rate limiter resets on server restart

**Fix:** This is expected. Rate limits are per-instance. For production, consider Redis-backed rate limiting (future).

### Sentry Not Receiving Events

**Cause:** SENTRY_DSN not set or incorrect

**Fix:**
```bash
# Verify environment variable
echo $SENTRY_DSN

# Test Sentry manually
curl -X POST https://sentry.io/api/0/projects/YOUR_PROJECT/store/ \
  -H "X-Sentry-Auth: Sentry sentry_key=YOUR_KEY" \
  -d '{"message": "Test event"}'
```

---

## Next Steps After Deployment

1. ✅ Monitor Sentry for 24 hours
2. ✅ Review structured logs for anomalies
3. ✅ Test rate limiting with real users
4. ✅ Verify email notifications respect preferences
5. ✅ Document any production-specific issues
6. ✅ Update STAGE_0_COMPLETE.md with production notes

---

## Production Checklist

- [ ] Database migration applied (`npx prisma migrate deploy`)
- [ ] SENTRY_DSN configured
- [ ] RESEND_API_KEY configured
- [ ] APP_ORIGIN set correctly
- [ ] Rate limiting tested (6th request returns 429)
- [ ] Sentry receiving errors
- [ ] Structured logs visible in CloudWatch/logs
- [ ] Auth flow works (magic link + password)
- [ ] No regressions in existing features
- [ ] Security questionnaire reviewed
- [ ] SMS status documented

---

**Stage 0 Deployment Complete!** 🎉

Proceed to Stage 1 when ready.
