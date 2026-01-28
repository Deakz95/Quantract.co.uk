-- Baseline migration: add neonAuthUserId to User

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "neonAuthUserId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_neonAuthUserId_key"
ON "User"("neonAuthUserId");
