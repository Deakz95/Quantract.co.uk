-- Add Lead Capture System Tables

-- Create PipelineStage table (required by Enquiry)
CREATE TABLE IF NOT EXISTS "PipelineStage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "isWon" BOOLEAN NOT NULL DEFAULT false,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PipelineStage_companyId_sortOrder_idx" ON "PipelineStage"("companyId", "sortOrder");

-- Create Enquiry table
CREATE TABLE IF NOT EXISTS "Enquiry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "ownerId" TEXT,
    "formConfigId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "postcode" TEXT,
    "message" TEXT,
    "notes" TEXT,
    "valueEstimate" INTEGER,
    "quoteId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "pageUrl" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "metaJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Enquiry_companyId_stageId_idx" ON "Enquiry"("companyId", "stageId");

-- Create EnquiryEvent table
CREATE TABLE IF NOT EXISTS "EnquiryEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnquiryEvent_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for PipelineStage
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign keys for Enquiry
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_stageId_fkey"
    FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign keys for EnquiryEvent
ALTER TABLE "EnquiryEvent" ADD CONSTRAINT "EnquiryEvent_enquiryId_fkey"
    FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Note: Enquiry columns are now created in the CREATE TABLE above

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

-- Create additional indexes for Enquiry
CREATE INDEX IF NOT EXISTS "Enquiry_source_idx" ON "Enquiry"("source");
CREATE INDEX IF NOT EXISTS "Enquiry_formConfigId_idx" ON "Enquiry"("formConfigId");
CREATE INDEX IF NOT EXISTS "Enquiry_ownerId_idx" ON "Enquiry"("ownerId");

-- Add foreign key constraints
ALTER TABLE "InboundIntegrationKey" ADD CONSTRAINT "InboundIntegrationKey_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AllowedDomain" ADD CONSTRAINT "AllowedDomain_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InboundFormConfig" ADD CONSTRAINT "InboundFormConfig_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_formConfigId_fkey"
    FOREIGN KEY ("formConfigId") REFERENCES "InboundFormConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
