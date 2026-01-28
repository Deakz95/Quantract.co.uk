-- Corrective migration: Add missing User columns that exist in schema but not in database
-- Fixes schema drift caused by schema changes without corresponding migrations

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "engineerId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaBackupCodes" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaEnrolledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "mfaRequiredBy" TIMESTAMP(3);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "currentImpersonationId" TEXT;

-- IMPORTANT: do NOT change companyId nullability in a drift-fix migration.
-- If you truly want nullable companyId, do it in a separate migration intentionally.
-- ALTER TABLE "User" ALTER COLUMN "companyId" DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Engineer')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_engineerId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_engineerId_fkey"
      FOREIGN KEY ("engineerId") REFERENCES "Engineer"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='Client')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_clientId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS "User_engineerId_idx" ON "User"("engineerId");
CREATE INDEX IF NOT EXISTS "User_clientId_idx" ON "User"("clientId");
