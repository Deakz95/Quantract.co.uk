-- Baseline migration: brings DB in sync with schema.prisma for StockAlert,
-- TruckStock indexes, and misc FK constraints that were added via db push / manual SQL.
-- All tables already exist in prod; this only adds missing constraints and indexes.

-- CreateTable: tables that were added via db push and need migration records
CREATE TABLE IF NOT EXISTS "ToolPreset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inputsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolPreset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RamsDocument" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentId" TEXT,
    "contentJson" JSONB NOT NULL,
    "jobId" TEXT,
    "clientId" TEXT,
    "preparedBy" TEXT,
    "reviewedBy" TEXT,
    "clientSignedBy" TEXT,
    "clientSignedAt" TIMESTAMP(3),
    "pdfKey" TEXT,
    "issuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RamsDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiEstimate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "description" TEXT,
    "imageSummary" TEXT,
    "estimateJson" JSONB NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'low',
    "tradeCategory" TEXT,
    "totalCost" DOUBLE PRECISION,
    "convertedToQuoteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiEstimate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StockAlert" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for newly created tables
CREATE INDEX IF NOT EXISTS "ToolPreset_companyId_toolSlug_idx" ON "ToolPreset"("companyId", "toolSlug");
CREATE INDEX IF NOT EXISTS "ToolPreset_userId_idx" ON "ToolPreset"("userId");
CREATE INDEX IF NOT EXISTS "RamsDocument_companyId_type_idx" ON "RamsDocument"("companyId", "type");
CREATE INDEX IF NOT EXISTS "RamsDocument_companyId_status_idx" ON "RamsDocument"("companyId", "status");
CREATE INDEX IF NOT EXISTS "RamsDocument_jobId_idx" ON "RamsDocument"("jobId");
CREATE INDEX IF NOT EXISTS "RamsDocument_clientId_idx" ON "RamsDocument"("clientId");
CREATE INDEX IF NOT EXISTS "AiEstimate_companyId_tradeCategory_idx" ON "AiEstimate"("companyId", "tradeCategory");
CREATE INDEX IF NOT EXISTS "AiEstimate_companyId_createdAt_idx" ON "AiEstimate"("companyId", "createdAt");
CREATE UNIQUE INDEX IF NOT EXISTS "StockAlert_companyId_type_entityId_key" ON "StockAlert"("companyId", "type", "entityId");
CREATE INDEX IF NOT EXISTS "StockAlert_companyId_status_idx" ON "StockAlert"("companyId", "status");

-- CreateIndex (idempotent: will fail silently if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyUser_companyId_userId_key" ON "CompanyUser"("companyId", "userId");

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_legalEntityId_invoiceNumber_key" ON "Invoice"("legalEntityId", "invoiceNumber");

-- AddForeignKey (wrapped in DO blocks so they're idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AuthSession_userId_fkey') THEN
    ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Job_siteId_fkey') THEN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'JobChecklist_templateId_fkey') THEN
    ALTER TABLE "JobChecklist" ADD CONSTRAINT "JobChecklist_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_assigneeId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_createdBy_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_jobId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Task_clientId_fkey') THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_companyId_fkey') THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ToolPreset_companyId_fkey') THEN
    ALTER TABLE "ToolPreset" ADD CONSTRAINT "ToolPreset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ToolPreset_userId_fkey') THEN
    ALTER TABLE "ToolPreset" ADD CONSTRAINT "ToolPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RamsDocument_jobId_fkey') THEN
    ALTER TABLE "RamsDocument" ADD CONSTRAINT "RamsDocument_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RamsDocument_clientId_fkey') THEN
    ALTER TABLE "RamsDocument" ADD CONSTRAINT "RamsDocument_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RamsDocument_parentId_fkey') THEN
    ALTER TABLE "RamsDocument" ADD CONSTRAINT "RamsDocument_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RamsDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RamsDocument_companyId_fkey') THEN
    ALTER TABLE "RamsDocument" ADD CONSTRAINT "RamsDocument_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RamsDocument_createdById_fkey') THEN
    ALTER TABLE "RamsDocument" ADD CONSTRAINT "RamsDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiEstimate_companyId_fkey') THEN
    ALTER TABLE "AiEstimate" ADD CONSTRAINT "AiEstimate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StockAlert_companyId_fkey') THEN
    ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
