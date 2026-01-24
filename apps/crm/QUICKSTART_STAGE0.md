# Quick Start: Stage 0 Local Development

**Goal:** Set up a local Docker Postgres database and test Stage 0 security hardening before deploying to production.

---

## Option 1: Automated Setup (Recommended)

### Windows (PowerShell/CMD)
```cmd
setup-stage0.bat
```

### Mac/Linux (Git Bash)
```bash
bash setup-stage0.sh
```

This script will:
1. ✅ Start PostgreSQL in Docker
2. ✅ Create `.env.local` from example
3. ✅ Install npm dependencies
4. ✅ Generate Prisma Client
5. ✅ Run database migrations (including Stage 0 security tables)
6. ✅ Seed test data (admin, engineer, client users)

**Time:** ~2-3 minutes

---

## Option 2: Manual Setup

### Step 1: Start Database
```bash
npm run docker:up
```

### Step 2: Configure Environment
```bash
# Copy example env file
cp .env.local.example .env.local

# Edit if needed (optional - defaults work)
```

### Step 3: Setup Database
```bash
# All-in-one command
npm run db:setup
```

**Or step-by-step:**
```bash
npm install                  # Install dependencies
npx prisma generate          # Generate Prisma Client
npx prisma migrate dev       # Run migrations
npm run prisma:seed          # Seed test data
```

### Step 4: Start Development
```bash
npm run dev
```

Visit: http://localhost:3000/admin/login

---

## Test Credentials

After setup, use these credentials to login:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@test.com | admin123 |
| **Engineer** | engineer@test.com | engineer123 |
| **Client** | client@test.com | client123 |

---

## Verify Stage 0 Security

### 1. Check Database Schema

```bash
# Open Prisma Studio (visual database browser)
npm run prisma:studio
```

**Verify these tables exist:**
- ✅ `User` has MFA columns (mfaEnabled, mfaSecret, etc.)
- ✅ `MfaSession` table exists
- ✅ `NotificationPreference` table exists

### 2. Test Rate Limiting

```bash
# Run Playwright tests
npm run test:e2e -- e2e-rate-limiting.spec.ts
```

**Expected results:**
- ✅ Magic link rate limiting works (5 requests/15min)
- ✅ Password login rate limiting works (10 requests/15min)
- ✅ Proper 429 responses with headers

### 3. Test Auth Flow

1. Start dev server: `npm run dev`
2. Go to http://localhost:3000/admin/login
3. Login with: admin@test.com / admin123
4. ✅ Should login successfully

---

## Common Commands

### Database
```bash
npm run docker:up          # Start Postgres
npm run docker:down        # Stop Postgres
npm run docker:logs        # View logs
npm run docker:reset       # Reset database (delete all data)
```

### Prisma
```bash
npm run prisma:studio      # Visual database browser
npm run prisma:generate    # Regenerate Prisma Client
npm run prisma:migrate:dev # Create new migration
npm run prisma:seed        # Re-seed test data
```

### Development
```bash
npm run dev                # Start Next.js dev server
npm run build              # Build for production
npm run typecheck          # Check TypeScript
npm run test:e2e           # Run all Playwright tests
```

---

## What Gets Created

### Database Tables (Stage 0)

**New Security Tables:**
- `MfaSession` - MFA challenge tokens (5-min TTL)
- `NotificationPreference` - User opt-in/opt-out settings

**Updated Tables:**
- `User` - Added 6 MFA columns (mfaEnabled, mfaSecret, etc.)

**Existing Tables:** (all created)
- Company, User, Client, Engineer, Quote, Invoice, Job, Certificate, etc.

### Test Data

**1 Company:**
- Test Company Ltd (slug: test-company)

**3 Users:**
- Admin (admin@test.com)
- Engineer (engineer@test.com)
- Client (client@test.com)

**Pipeline Stages:**
- New Lead → Contacted → Qualified → Quote Sent → Won/Lost

**1 Sample Enquiry:**
- Jane Smith (interested in electrical installation)

---

## Troubleshooting

### Port 5433 Already in Use

```bash
# Find what's using the port
netstat -ano | findstr :5433

# Option 1: Kill that process
# Option 2: Change port in docker-compose.dev.yml to 5434
```

### Docker Won't Start

```bash
# Check Docker Desktop is running
docker info

# If not, start Docker Desktop app
```

### Prisma Client Out of Sync

```bash
# Regenerate
npx prisma generate

# Restart dev server
npm run dev
```

### Migration Errors

```bash
# Reset everything and start fresh
npm run docker:reset
npm run db:setup
```

### Can't Login

**Issue:** "Invalid email or password"

**Solutions:**
1. Check you're using correct credentials (admin@test.com / admin123)
2. Verify database was seeded: `npm run prisma:seed`
3. Check user exists in Prisma Studio: `npm run prisma:studio`

---

## Next Steps

After verifying Stage 0 locally:

1. ✅ **Test rate limiting** - Try 6 magic link requests (should get 429)
2. ✅ **Check Prisma Studio** - Verify MFA/notification tables exist
3. ✅ **Run Playwright tests** - All Stage 0 tests should pass
4. ✅ **Review documentation** - Read STAGE_0_COMPLETE.md
5. ➡️ **Deploy to Production** - Follow DEPLOYMENT_STAGE_0.md
6. ➡️ **Proceed to Stage 1** - CRM implementation

---

## Production Deployment

Once Stage 0 is verified locally:

### 1. Apply Migration to Neon (Production)

```bash
# Set production DATABASE_URL
export DATABASE_URL="postgresql://user:pass@neon.tech/db"

# Apply migrations (no prompts)
npx prisma migrate deploy

# Verify
npx prisma studio
```

### 2. Deploy to Render

```bash
# Push code to Git
git add .
git commit -m "Stage 0: Security hardening complete"
git push

# Render will automatically:
# 1. Run npm install
# 2. Run npx prisma generate
# 3. Run npx prisma migrate deploy
# 4. Build and deploy
```

### 3. Verify Production

1. Check Sentry for errors
2. Test rate limiting (try 6 magic link requests)
3. Verify auth flow works
4. Check structured logs appear

---

## Files Created

### Docker Setup
- `docker-compose.dev.yml` - Docker Postgres config
- `.env.local.example` - Environment template
- `.env.local` - Your local config (gitignored)

### Scripts
- `setup-stage0.sh` - Unix setup script
- `setup-stage0.bat` - Windows setup script

### Documentation
- `SETUP_LOCAL_DEV.md` - Full setup guide
- `QUICKSTART_STAGE0.md` - This file
- `STAGE_0_COMPLETE.md` - Implementation summary
- `DEPLOYMENT_STAGE_0.md` - Production deployment guide

---

## Questions?

- **Setup issues?** See `SETUP_LOCAL_DEV.md`
- **Stage 0 details?** See `STAGE_0_COMPLETE.md`
- **Production deployment?** See `DEPLOYMENT_STAGE_0.md`
- **Security questions?** See `docs/SECURITY_QUESTIONNAIRE.md`

---

**Status:** 🟢 Ready to run Stage 0 locally!

Run `setup-stage0.bat` (Windows) or `bash setup-stage0.sh` (Mac/Linux) to get started.
