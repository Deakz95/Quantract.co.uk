-- Add multi-tenant database support fields to Company
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "subdomain" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "dedicatedDatabaseUrl" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "dataTier" TEXT NOT NULL DEFAULT 'shared';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "dataRegion" TEXT DEFAULT 'eu-west-2';

-- Create unique index on subdomain
CREATE UNIQUE INDEX IF NOT EXISTS "Company_subdomain_key" ON "Company"("subdomain");

-- Comment: dataTier can be 'shared' or 'dedicated'
-- Comment: dedicatedDatabaseUrl is encrypted and only set for dedicated tier clients
