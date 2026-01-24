-- Add Company theme columns if missing.
-- These are required by the current Prisma schema and seed.

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "themePrimary" TEXT NOT NULL DEFAULT '#0f172a';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "themeAccent"  TEXT NOT NULL DEFAULT '#6366f1';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "themeBg"      TEXT NOT NULL DEFAULT '#f8fafc';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "themeText"    TEXT NOT NULL DEFAULT '#111827';
