# Local Development Setup with Docker

This guide sets up a local PostgreSQL database using Docker for development and testing Stage 0 security hardening before deploying to production.

---

## Prerequisites

- Docker Desktop installed and running
- Node.js 22+ installed
- Git Bash or PowerShell

---

## Quick Start

### 1. Start Local Database

```bash
# Start PostgreSQL in Docker
docker-compose -f docker-compose.dev.yml up -d

# Check database is running
docker-compose -f docker-compose.dev.yml ps

# View logs (optional)
docker-compose -f docker-compose.dev.yml logs -f postgres
```

### 2. Configure Environment

```bash
# Copy example env file
cp .env.local.example .env.local

# Edit .env.local if needed
# Default DATABASE_URL is already set for local Docker Postgres
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Database Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (creates tables + applies Stage 0 security hardening)
npx prisma migrate dev

# You'll be prompted for a migration name, use:
# "initial_schema_with_stage0_security"
```

This will:
- Create all existing tables (Company, User, Client, Invoice, etc.)
- Add Stage 0 security features (MFA fields, MfaSession, NotificationPreference)
- Generate Prisma Client

### 5. Seed Database (Optional)

```bash
# Create initial admin user and test data
npx prisma db seed
```

### 6. Start Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

---

## Database Management

### View Database

**Option 1: Prisma Studio (Visual UI)**
```bash
npx prisma studio
```
Opens at http://localhost:5555

**Option 2: psql CLI**
```bash
# Connect to database
docker exec -it quantract-dev-db psql -U quantract -d quantract_dev

# Useful commands:
\dt              # List all tables
\d "User"        # Describe User table
\d "MfaSession"  # Describe MfaSession table
SELECT * FROM "User";  # Query users
\q               # Quit
```

**Option 3: GUI Tool**
- **Connection Details:**
  - Host: `localhost`
  - Port: `5433`
  - Database: `quantract_dev`
  - User: `quantract`
  - Password: `dev_password_local`

Use tools like:
- pgAdmin
- DBeaver
- TablePlus
- DataGrip

### Reset Database

```bash
# Stop containers
docker-compose -f docker-compose.dev.yml down

# Delete data volume
docker volume rm app_postgres_dev_data

# Start fresh
docker-compose -f docker-compose.dev.yml up -d
npx prisma migrate dev
```

### Reset Migrations Only

```bash
# Delete migration history
npx prisma migrate reset

# This will:
# 1. Drop all tables
# 2. Reapply all migrations
# 3. Run seed script (if exists)
```

---

## Verify Stage 0 Security Hardening

### 1. Check Database Schema

```bash
npx prisma studio
```

**Verify these tables exist:**
- ✅ `User` table has MFA columns:
  - `mfaEnabled` (Boolean)
  - `mfaSecret` (String)
  - `mfaBackupCodes` (String)
  - `mfaEnrolledAt` (DateTime)
  - `mfaVerifiedAt` (DateTime)
  - `mfaRequiredBy` (DateTime)

- ✅ `MfaSession` table exists with columns:
  - `id`, `userId`, `status`, `challengeToken`, `createdAt`, `expiresAt`, `verifiedAt`, `ipAddress`, `userAgent`

- ✅ `NotificationPreference` table exists with columns:
  - `id`, `userId`, `channel`, `category`, `enabled`, `createdAt`, `updatedAt`

### 2. Test Rate Limiting

```bash
# Run Playwright tests
npm run test:e2e -- e2e-rate-limiting.spec.ts
```

**Expected Results:**
- ✅ Magic link rate limiting works (5 requests/15min)
- ✅ Password login rate limiting works (10 requests/15min)
- ✅ 429 responses include Retry-After headers
- ✅ No email existence leakage

### 3. Test Auth Flow

```bash
# Start dev server
npm run dev

# Test magic link (if RESEND_API_KEY configured)
# 1. Go to http://localhost:3000/admin/login
# 2. Enter email and request magic link
# 3. Check rate limiting after 5 requests

# Test password login
# 1. Create admin via bootstrap (set ADMIN_EMAIL in .env.local)
# 2. Login at http://localhost:3000/admin/login
# 3. Verify rate limiting after 10 failed attempts
```

### 4. Check Sentry Integration (Optional)

```bash
# If SENTRY_DSN is configured in .env.local:
# 1. Trigger an error (e.g., invalid API request)
# 2. Check Sentry dashboard for error
# 3. Verify sensitive data is scrubbed
```

---

## Common Issues

### Port 5433 Already in Use

```bash
# Check what's using the port
netstat -ano | findstr :5433

# Change port in docker-compose.dev.yml:
# ports:
#   - "5434:5432"  # Use different port

# Update DATABASE_URL in .env.local:
# DATABASE_URL="postgresql://quantract:dev_password_local@localhost:5434/quantract_dev"
```

### Docker Not Starting

```bash
# Check Docker Desktop is running
docker info

# If not running, start Docker Desktop

# Check container logs
docker-compose -f docker-compose.dev.yml logs postgres
```

### Prisma Client Out of Sync

```bash
# Regenerate Prisma Client
npx prisma generate

# Restart dev server
npm run dev
```

### Migration Conflicts

```bash
# If you have migration conflicts:

# Option 1: Reset everything
npx prisma migrate reset

# Option 2: Force push current schema
npx prisma db push --skip-generate

# Option 3: Create new migration
npx prisma migrate dev --create-only
# Edit SQL file if needed
npx prisma migrate dev
```

---

## Stop/Start Database

### Stop Database (Keep Data)
```bash
docker-compose -f docker-compose.dev.yml stop
```

### Start Database
```bash
docker-compose -f docker-compose.dev.yml start
```

### Stop and Remove Containers (Keep Data)
```bash
docker-compose -f docker-compose.dev.yml down
```

### Stop and Delete All Data
```bash
docker-compose -f docker-compose.dev.yml down -v
```

---

## Migration Workflow

### Create New Migration

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name your_migration_name

# 3. Review generated SQL in prisma/migrations/
# 4. Test migration works
# 5. Commit migration files to Git
```

### Apply Migration to Production (Neon)

```bash
# Switch to production DATABASE_URL
export DATABASE_URL="postgresql://user:pass@neon.tech/db"

# Apply migrations (no prompts)
npx prisma migrate deploy

# Switch back to local
export DATABASE_URL="postgresql://quantract:dev_password_local@localhost:5433/quantract_dev"
```

---

## VS Code Integration

### Recommended Extensions

- **Prisma** (Prisma.prisma)
- **Docker** (ms-azuretools.vscode-docker)
- **PostgreSQL** (ckolkman.vscode-postgres)

### Add to .vscode/settings.json

```json
{
  "[prisma]": {
    "editor.defaultFormatter": "Prisma.prisma"
  },
  "prisma.showPrismaDataPlatformNotification": false
}
```

---

## Production Deployment Checklist

Before deploying to Neon/Render:

- [ ] All migrations tested locally
- [ ] Playwright tests pass
- [ ] No TypeScript errors (`npm run build`)
- [ ] `.env.local` not committed to Git
- [ ] Stage 0 documentation reviewed
- [ ] Database backup created (Neon dashboard)
- [ ] Environment variables configured in Render
- [ ] Migration applied to production: `npx prisma migrate deploy`

---

## Next Steps

After Stage 0 is verified locally:

1. ✅ Apply migration to Neon production database
2. ✅ Deploy to Render with updated code
3. ✅ Verify rate limiting in production
4. ✅ Check Sentry for any errors
5. ➡️ **Proceed to Stage 1: CRM Implementation**

---

## Useful Commands Reference

```bash
# Docker
docker-compose -f docker-compose.dev.yml up -d      # Start database
docker-compose -f docker-compose.dev.yml down       # Stop database
docker-compose -f docker-compose.dev.yml logs -f    # View logs
docker-compose -f docker-compose.dev.yml ps         # Check status

# Prisma
npx prisma generate                    # Generate client
npx prisma migrate dev                 # Create & apply migration
npx prisma migrate deploy              # Apply migrations (prod)
npx prisma migrate reset               # Reset database
npx prisma studio                      # Open visual editor
npx prisma db push                     # Push schema (dev only)
npx prisma db seed                     # Run seed script

# Development
npm install                            # Install dependencies
npm run dev                            # Start dev server
npm run build                          # Build for production
npm run test:e2e                       # Run Playwright tests

# Database
docker exec -it quantract-dev-db psql -U quantract -d quantract_dev  # psql CLI
```

---

**Questions?** Check:
- `/STAGE_0_COMPLETE.md` - Stage 0 implementation details
- `/DEPLOYMENT_STAGE_0.md` - Production deployment guide
- `/docs/SECURITY_QUESTIONNAIRE.md` - Security documentation
