-- Add userId column to CompanyUser for linking to User table
-- This enables membership-based role resolution

-- Step 1: Add nullable userId column
ALTER TABLE "CompanyUser" ADD COLUMN "userId" TEXT;

-- Step 2: Create index on userId for faster lookups
CREATE INDEX "CompanyUser_userId_idx" ON "CompanyUser"("userId");

-- Step 3: Add unique constraint for (companyId, userId) when userId is not null
-- This ensures one membership per user per company
CREATE UNIQUE INDEX "CompanyUser_companyId_userId_key" ON "CompanyUser"("companyId", "userId") WHERE "userId" IS NOT NULL;

-- Step 4: Add foreign key constraint to User table
ALTER TABLE "CompanyUser" ADD CONSTRAINT "CompanyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Note: userId is intentionally nullable to support:
-- 1. Backwards compatibility during migration
-- 2. Invite flows where CompanyUser is created before User accepts
-- 3. Email-based lookups as fallback
--
-- The backfill script (scripts/backfill-company-user-ids.ts) should be run
-- after this migration to populate userId for existing records.
