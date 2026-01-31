-- AlterTable: Add lead scoring columns to Enquiry
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "leadScore" INTEGER DEFAULT 0;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "leadPriority" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "leadScoreReason" JSONB;

-- CreateIndex: Enquiry lead priority
CREATE INDEX IF NOT EXISTS "Enquiry_companyId_leadPriority_idx" ON "Enquiry"("companyId", "leadPriority");

-- CreateTable: EnquiryKeywordHit
CREATE TABLE IF NOT EXISTS "EnquiryKeywordHit" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnquiryKeywordHit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EnquiryKeywordHit_companyId_enquiryId_idx" ON "EnquiryKeywordHit"("companyId", "enquiryId");

ALTER TABLE "EnquiryKeywordHit" DROP CONSTRAINT IF EXISTS "EnquiryKeywordHit_companyId_fkey";
ALTER TABLE "EnquiryKeywordHit" ADD CONSTRAINT "EnquiryKeywordHit_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EnquiryKeywordHit" DROP CONSTRAINT IF EXISTS "EnquiryKeywordHit_enquiryId_fkey";
ALTER TABLE "EnquiryKeywordHit" ADD CONSTRAINT "EnquiryKeywordHit_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: LeadScoringConfig
CREATE TABLE IF NOT EXISTS "LeadScoringConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadScoringConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LeadScoringConfig_companyId_key" ON "LeadScoringConfig"("companyId");

ALTER TABLE "LeadScoringConfig" DROP CONSTRAINT IF EXISTS "LeadScoringConfig_companyId_fkey";
ALTER TABLE "LeadScoringConfig" ADD CONSTRAINT "LeadScoringConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: InstalledAsset (if not exists)
CREATE TABLE IF NOT EXISTS "InstalledAsset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT,
    "jobId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "manufacturer" TEXT,
    "model" TEXT,
    "serial" TEXT,
    "installedAt" TIMESTAMP(3),
    "nextServiceAt" TIMESTAMP(3),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstalledAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InstalledAsset_companyId_clientId_idx" ON "InstalledAsset"("companyId", "clientId");
CREATE INDEX IF NOT EXISTS "InstalledAsset_companyId_jobId_idx" ON "InstalledAsset"("companyId", "jobId");
CREATE INDEX IF NOT EXISTS "InstalledAsset_companyId_nextServiceAt_idx" ON "InstalledAsset"("companyId", "nextServiceAt");

ALTER TABLE "InstalledAsset" DROP CONSTRAINT IF EXISTS "InstalledAsset_companyId_fkey";
ALTER TABLE "InstalledAsset" ADD CONSTRAINT "InstalledAsset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InstalledAsset" DROP CONSTRAINT IF EXISTS "InstalledAsset_clientId_fkey";
ALTER TABLE "InstalledAsset" ADD CONSTRAINT "InstalledAsset_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InstalledAsset" DROP CONSTRAINT IF EXISTS "InstalledAsset_jobId_fkey";
ALTER TABLE "InstalledAsset" ADD CONSTRAINT "InstalledAsset_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable: MaintenanceRule (if not exists)
CREATE TABLE IF NOT EXISTS "MaintenanceRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assetType" TEXT,
    "intervalDays" INTEGER,
    "condition" JSONB,
    "action" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MaintenanceRule_companyId_isActive_idx" ON "MaintenanceRule"("companyId", "isActive");

ALTER TABLE "MaintenanceRule" DROP CONSTRAINT IF EXISTS "MaintenanceRule_companyId_fkey";
ALTER TABLE "MaintenanceRule" ADD CONSTRAINT "MaintenanceRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: MaintenanceAlert (if not exists)
CREATE TABLE IF NOT EXISTS "MaintenanceAlert" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "ruleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "meta" JSONB,

    CONSTRAINT "MaintenanceAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MaintenanceAlert_companyId_status_dueAt_idx" ON "MaintenanceAlert"("companyId", "status", "dueAt");
CREATE INDEX IF NOT EXISTS "MaintenanceAlert_companyId_assetId_idx" ON "MaintenanceAlert"("companyId", "assetId");

ALTER TABLE "MaintenanceAlert" DROP CONSTRAINT IF EXISTS "MaintenanceAlert_companyId_fkey";
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaintenanceAlert" DROP CONSTRAINT IF EXISTS "MaintenanceAlert_assetId_fkey";
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InstalledAsset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MaintenanceAlert" DROP CONSTRAINT IF EXISTS "MaintenanceAlert_ruleId_fkey";
ALTER TABLE "MaintenanceAlert" ADD CONSTRAINT "MaintenanceAlert_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "MaintenanceRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
