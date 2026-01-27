-- Add Lead Capture System Tables

-- Extend Enquiry model with new fields
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "formConfigId" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "postcode" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "pageUrl" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "referrer" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "utmSource" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "utmMedium" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "utmTerm" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "utmContent" TEXT;
ALTER TABLE "Enquiry" ADD COLUMN IF NOT EXISTS "metaJson" JSONB;

-- Create InboundIntegrationKey table
CREATE TABLE IF NOT EXISTS "InboundIntegrationKey" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT 'enquiry:create',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundIntegrationKey_pkey" PRIMARY KEY ("id")
);

-- Create AllowedDomain table
CREATE TABLE IF NOT EXISTS "AllowedDomain" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationKey" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllowedDomain_pkey" PRIMARY KEY ("id")
);

-- Create InboundFormConfig table
CREATE TABLE IF NOT EXISTS "InboundFormConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "defaultStageId" TEXT,
    "defaultOwnerId" TEXT,
    "requiredFields" JSONB NOT NULL DEFAULT '["name", "email"]',
    "optionalFields" JSONB NOT NULL DEFAULT '["phone", "message"]',
    "thankYouMessage" TEXT,
    "redirectUrl" TEXT,
    "notifyEmails" TEXT,
    "enableCaptcha" BOOLEAN NOT NULL DEFAULT true,
    "enableHoneypot" BOOLEAN NOT NULL DEFAULT true,
    "rateLimitPerMinute" INTEGER NOT NULL DEFAULT 5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundFormConfig_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "InboundIntegrationKey_keyHash_key" ON "InboundIntegrationKey"("keyHash");
CREATE UNIQUE INDEX IF NOT EXISTS "InboundIntegrationKey_companyId_name_key" ON "InboundIntegrationKey"("companyId", "name");
CREATE UNIQUE INDEX IF NOT EXISTS "AllowedDomain_companyId_domain_key" ON "AllowedDomain"("companyId", "domain");
CREATE UNIQUE INDEX IF NOT EXISTS "InboundFormConfig_companyId_slug_key" ON "InboundFormConfig"("companyId", "slug");

-- Create indexes for InboundIntegrationKey
CREATE INDEX IF NOT EXISTS "InboundIntegrationKey_companyId_idx" ON "InboundIntegrationKey"("companyId");
CREATE INDEX IF NOT EXISTS "InboundIntegrationKey_keyHash_idx" ON "InboundIntegrationKey"("keyHash");
CREATE INDEX IF NOT EXISTS "InboundIntegrationKey_isActive_idx" ON "InboundIntegrationKey"("isActive");

-- Create indexes for AllowedDomain
CREATE INDEX IF NOT EXISTS "AllowedDomain_companyId_idx" ON "AllowedDomain"("companyId");
CREATE INDEX IF NOT EXISTS "AllowedDomain_domain_idx" ON "AllowedDomain"("domain");
CREATE INDEX IF NOT EXISTS "AllowedDomain_isActive_idx" ON "AllowedDomain"("isActive");

-- Create indexes for InboundFormConfig
CREATE INDEX IF NOT EXISTS "InboundFormConfig_companyId_idx" ON "InboundFormConfig"("companyId");
CREATE INDEX IF NOT EXISTS "InboundFormConfig_slug_idx" ON "InboundFormConfig"("slug");
CREATE INDEX IF NOT EXISTS "InboundFormConfig_isActive_idx" ON "InboundFormConfig"("isActive");

-- Create indexes for Enquiry new fields
CREATE INDEX IF NOT EXISTS "Enquiry_source_idx" ON "Enquiry"("source");
CREATE INDEX IF NOT EXISTS "Enquiry_formConfigId_idx" ON "Enquiry"("formConfigId");

-- Add foreign key constraints
ALTER TABLE "InboundIntegrationKey" ADD CONSTRAINT "InboundIntegrationKey_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AllowedDomain" ADD CONSTRAINT "AllowedDomain_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InboundFormConfig" ADD CONSTRAINT "InboundFormConfig_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_formConfigId_fkey"
    FOREIGN KEY ("formConfigId") REFERENCES "InboundFormConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
