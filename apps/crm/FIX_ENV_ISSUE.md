# Fix: Database Environment Issue

## Problem

The setup script ran migrations against **Neon production** instead of **local Docker Postgres** because Prisma loaded `.env` (which has Neon connection) instead of the local Docker database URL.

**Error:** `column "mfaEnabled" does not exist in the current database`

This happened because:
- Migration tried to apply to **Neon** (production)
- Neon already has migrations from before Stage 0
- Seed script expected Stage 0 columns to exist

---

## Solution: Switch to Local Docker Database

###  **Step 1: Stop and Reset**

```cmd
# Stop Docker
npm run docker:down

# Clean up (deletes local data)
docker volume rm web_portal_postgres_dev_data
```

### **Step 2: Switch Environment**

```cmd
# Backup your production .env
copy .env .env.production.backup

# Use Docker environment
copy .env.docker .env
```

### **Step 3: Run Setup Again**

```cmd
# Start fresh
npm run docker:up

# Wait for Postgres to be ready (10 seconds)
timeout /t 10

# Generate Prisma Client
npx prisma generate

# Create database from scratch
npx prisma migrate dev --name initial_with_stage0_security

# Seed test data
npm run prisma:seed
```

### **Step 4: Start Development**

```cmd
npm run dev
```

Visit: http://localhost:3000/admin/login
Login: admin@test.com / admin123

---

## Alternative: Quick Reset Script

I've updated `setup-stage0.bat` to automatically handle this. Just run:

```cmd
# This now automatically:
# 1. Backs up .env to .env.production.backup
# 2. Copies .env.docker to .env
# 3. Sets up local database

setup-stage0.bat
```

---

## Verify It's Working

### Check Database URL

```cmd
# View current DATABASE_URL
findstr "DATABASE_URL" .env
```

**Should show:**
```
DATABASE_URL="postgresql://quantract:dev_password_local@localhost:5433/quantract_dev"
```

**NOT:**
```
DATABASE_URL=postgresql://neon...
```

### Check Tables Exist

```cmd
# Open Prisma Studio
npm run prisma:studio
```

**Verify:**
- ✅ User table has `mfaEnabled` column
- ✅ MfaSession table exists
- ✅ NotificationPreference table exists

---

## Switch Back to Production

When you're done with local development:

```cmd
# Restore production environment
copy .env.production.backup .env

# Now Prisma connects to Neon again
```

---

## Current Status

**What happened:**
1. ✅ Docker Postgres started successfully
2. ❌ Migration ran against Neon (production) instead of local
3. ❌ Seed failed because local DB doesn't have Stage 0 columns

**What to do:**
1. Run the 4-step solution above, OR
2. Run updated `setup-stage0.bat` which handles this automatically

---

## Prevention

Going forward, the updated `setup-stage0.bat` will:
1. Automatically backup `.env` to `.env.production.backup`
2. Copy `.env.docker` to `.env` before running migrations
3. Ensure all Prisma commands use local Docker Postgres

**Never commit `.env` to Git!** (already gitignored)

---

## Questions?

**Still getting Neon errors?**
- Check: `findstr "DATABASE_URL" .env`
- Should be: `localhost:5433` not `neon.tech`

**Want to use Neon for development?**
- Don't! Neon is production. Always use Docker locally.

**Need to apply Stage 0 to Neon?**
- Follow `DEPLOYMENT_STAGE_0.md` after local testing

---

**Next:** Run `setup-stage0.bat` again (it's fixed now!)
