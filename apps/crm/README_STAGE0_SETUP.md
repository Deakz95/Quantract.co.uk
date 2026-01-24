# Stage 0 Setup Complete ✅

This repository now includes **complete local Docker setup** for testing Stage 0 security hardening before deployment.

---

## 🚀 Quick Start (2 minutes)

### Windows
```cmd
setup-stage0.bat
```

### Mac/Linux
```bash
bash setup-stage0.sh
```

Then:
```bash
npm run dev
```

Visit: **http://localhost:3000/admin/login**

**Login:** admin@test.com / admin123

---

## 📁 What Was Added

### Docker Setup
| File | Purpose |
|------|---------|
| `docker-compose.dev.yml` | Local PostgreSQL database (port 5433) |
| `.env.local.example` | Environment template for local development |
| `setup-stage0.sh` | Unix automated setup script |
| `setup-stage0.bat` | Windows automated setup script |

### Documentation
| File | Purpose |
|------|---------|
| `QUICKSTART_STAGE0.md` | Quick start guide (you are here) |
| `SETUP_LOCAL_DEV.md` | Detailed setup and troubleshooting |
| `STAGE_0_COMPLETE.md` | Stage 0 implementation summary |
| `DEPLOYMENT_STAGE_0.md` | Production deployment guide |

### NPM Scripts (updated)
```json
{
  "docker:up": "Start Postgres in Docker",
  "docker:down": "Stop Postgres",
  "docker:logs": "View database logs",
  "docker:reset": "Reset database (delete all data)",
  "prisma:studio": "Visual database browser",
  "prisma:seed": "Populate test data",
  "db:setup": "All-in-one: generate + migrate + seed"
}
```

---

## ✅ Stage 0 Security Features

### 1. MFA (Multi-Factor Authentication) - Design Ready
- ✅ Schema includes MFA fields on User model
- ✅ MfaSession table for challenge-response flow
- ✅ TOTP-based implementation in `/src/lib/server/mfa.ts`
- ⏸️ Not actively enforced (can be enabled without migration)

### 2. Rate Limiting & Brute Force Protection
- ✅ Magic Link: 5 requests/15min (IP + Email)
- ✅ Password Login: 10 requests/15min (IP + Email)
- ✅ Proper 429 responses with Retry-After headers
- ✅ Playwright tests in `/tests/playwright/e2e-rate-limiting.spec.ts`

### 3. Observability - Sentry with Structured Logging
- ✅ Enhanced Sentry config with privacy filters
- ✅ Structured JSON logging (requestId, companyId, userId)
- ✅ Security event tracking (auth failures, rate limits)
- ✅ Sensitive data scrubbing (passwords, tokens, API keys)

### 4. Notification Preferences
- ✅ NotificationPreference table with opt-in/opt-out
- ✅ Categories: system, invoices, quotes, jobs, certificates, reminders
- ✅ Enforced before sending emails
- ✅ Default: All email enabled, SMS disabled

### 5. SMS - Explicitly NOT SUPPORTED
- ✅ Documented in `/docs/SMS_STATUS.md`
- ✅ Schema supports future SMS (no migration needed)
- ✅ Clear rationale and future enablement path

### 6. Testing
- ✅ Playwright smoke tests for rate limiting
- ✅ Test all auth endpoints
- ✅ Verify 429 responses and headers

### 7. Documentation
- ✅ Security questionnaire ready for enterprise onboarding
- ✅ Covers: Auth, MFA, encryption, rate limiting, GDPR, compliance

---

## 🧪 Testing Stage 0 Locally

### 1. Run Setup Script
```bash
setup-stage0.bat  # Windows
# or
bash setup-stage0.sh  # Mac/Linux
```

### 2. Verify Database Schema
```bash
npm run prisma:studio
```

**Check:**
- User table has `mfaEnabled`, `mfaSecret`, `mfaBackupCodes` columns
- MfaSession table exists
- NotificationPreference table exists

### 3. Test Rate Limiting
```bash
npm run test:e2e -- e2e-rate-limiting.spec.ts
```

**Expected:**
- ✅ All tests pass
- ✅ Magic link rate limiting works
- ✅ Password login rate limiting works

### 4. Test Auth Flow
1. Start server: `npm run dev`
2. Go to http://localhost:3000/admin/login
3. Login with admin@test.com / admin123
4. Try 6 magic link requests → 6th should return 429

---

## 📊 Database Schema Changes

### New Tables
```sql
-- MFA challenge sessions (5-minute TTL)
CREATE TABLE "MfaSession" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  challengeToken TEXT UNIQUE,
  createdAt TIMESTAMP DEFAULT NOW(),
  expiresAt TIMESTAMP NOT NULL,
  verifiedAt TIMESTAMP,
  ipAddress TEXT,
  userAgent TEXT
);

-- User notification preferences
CREATE TABLE "NotificationPreference" (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  channel TEXT NOT NULL,  -- 'email' | 'sms'
  category TEXT NOT NULL, -- 'system' | 'invoices' | etc.
  enabled BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP
);
```

### Updated Tables
```sql
-- User table: Added MFA columns
ALTER TABLE "User" ADD COLUMN mfaEnabled BOOLEAN DEFAULT false;
ALTER TABLE "User" ADD COLUMN mfaSecret TEXT;
ALTER TABLE "User" ADD COLUMN mfaBackupCodes TEXT;
ALTER TABLE "User" ADD COLUMN mfaEnrolledAt TIMESTAMP;
ALTER TABLE "User" ADD COLUMN mfaVerifiedAt TIMESTAMP;
ALTER TABLE "User" ADD COLUMN mfaRequiredBy TIMESTAMP;
```

---

## 🛠️ Common Commands

### Quick Start
```bash
npm run docker:up       # Start Postgres
npm run db:setup        # Setup database (generate + migrate + seed)
npm run dev             # Start dev server
```

### Database Management
```bash
npm run prisma:studio   # Visual database browser (http://localhost:5555)
npm run docker:logs     # View Postgres logs
npm run docker:down     # Stop Postgres
npm run docker:reset    # Delete all data and restart
```

### Development
```bash
npm run dev             # Start Next.js dev server
npm run build           # Build for production
npm run typecheck       # TypeScript check
npm run test:e2e        # Run all Playwright tests
```

### Migrations
```bash
npx prisma migrate dev  # Create new migration
npx prisma migrate deploy  # Apply to production
npx prisma migrate reset   # Reset database
```

---

## 🚀 Production Deployment

After testing locally:

### 1. Apply Migration to Neon
```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://user:pass@neon.tech/db"

# Apply migrations
npx prisma migrate deploy
```

### 2. Deploy to Render
```bash
git add .
git commit -m "Stage 0: Security hardening complete"
git push
```

Render auto-deploys and runs migrations.

### 3. Verify Production
- ✅ Test rate limiting (try 6 magic link requests)
- ✅ Check Sentry for errors
- ✅ Verify auth flow works
- ✅ Review structured logs

---

## 📖 Documentation Index

| Document | Purpose |
|----------|---------|
| **QUICKSTART_STAGE0.md** | Quick start guide |
| **SETUP_LOCAL_DEV.md** | Detailed setup + troubleshooting |
| **STAGE_0_COMPLETE.md** | Implementation summary |
| **DEPLOYMENT_STAGE_0.md** | Production deployment |
| **docs/SECURITY_QUESTIONNAIRE.md** | Security Q&A for enterprise |
| **docs/SMS_STATUS.md** | SMS decision documentation |

---

## 🔄 Workflow

```
┌─────────────────────────────────────────────────┐
│ 1. Run setup-stage0.bat                         │
│    → Starts Docker Postgres                     │
│    → Runs migrations (creates MFA tables)       │
│    → Seeds test data                            │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 2. npm run dev                                  │
│    → Start Next.js development server           │
│    → Visit http://localhost:3000/admin/login    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 3. Test Stage 0 Features                        │
│    → Login with admin@test.com / admin123       │
│    → Test rate limiting (6 requests → 429)      │
│    → Run tests: npm run test:e2e               │
│    → View DB: npm run prisma:studio             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 4. Deploy to Production                         │
│    → Apply migration to Neon                    │
│    → Push to Git (Render auto-deploys)         │
│    → Verify in production                       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ 5. Proceed to Stage 1: CRM                      │
│    → Manual lead entry                          │
│    → Public enquiry form                        │
│    → Owner assignment                           │
│    → Unified timeline                           │
│    → Attachments + tags                         │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Next Steps

**You have three options:**

### Option A: Test Stage 0 Locally First (Recommended)
```bash
setup-stage0.bat
npm run dev
npm run test:e2e -- e2e-rate-limiting.spec.ts
```

### Option B: Deploy Stage 0 to Production
Follow **DEPLOYMENT_STAGE0.md**

### Option C: Skip to Stage 1 Development
I can proceed with Stage 1 CRM implementation while you handle Stage 0 deployment separately.

---

## ❓ Questions?

**Setup not working?** → Check `SETUP_LOCAL_DEV.md` troubleshooting section

**What is Stage 0?** → See `STAGE_0_COMPLETE.md`

**How to deploy?** → See `DEPLOYMENT_STAGE_0.md`

**Security questions?** → See `docs/SECURITY_QUESTIONNAIRE.md`

---

**Status:** 🟢 **Ready for local testing!**

Run `setup-stage0.bat` to get started in 2 minutes.
