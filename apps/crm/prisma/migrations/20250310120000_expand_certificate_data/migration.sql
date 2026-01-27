-- Add Certificate data columns (idempotent)
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "dataVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "data" JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);
