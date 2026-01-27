-- Add rateCardId to Engineer (idempotent)
ALTER TABLE "Engineer" ADD COLUMN IF NOT EXISTS "rateCardId" TEXT;

-- CreateTable RateCard (idempotent)
CREATE TABLE IF NOT EXISTS "RateCard" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chargeRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable JobBudgetLine (idempotent)
CREATE TABLE IF NOT EXISTS "JobBudgetLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'quote',
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobBudgetLine_pkey" PRIMARY KEY ("id")
);

-- Add columns to SupplierBill (idempotent)
ALTER TABLE "SupplierBill" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "SupplierBill" ADD COLUMN IF NOT EXISTS "postedAt" TIMESTAMP(3);

-- Add columns to CostItem (idempotent)
ALTER TABLE "CostItem" ADD COLUMN IF NOT EXISTS "stageId" TEXT;
ALTER TABLE "CostItem" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "CostItem" ADD COLUMN IF NOT EXISTS "lockStatus" TEXT NOT NULL DEFAULT 'open';
ALTER TABLE "CostItem" ADD COLUMN IF NOT EXISTS "incurredAt" TIMESTAMP(3);
ALTER TABLE "CostItem" ADD COLUMN IF NOT EXISTS "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable CostItemAttachment (idempotent)
CREATE TABLE IF NOT EXISTS "CostItemAttachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "costItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostItemAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "RateCard_companyId_idx" ON "RateCard"("companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "RateCard_companyId_name_key" ON "RateCard"("companyId", "name");

CREATE INDEX IF NOT EXISTS "JobBudgetLine_companyId_idx" ON "JobBudgetLine"("companyId");
CREATE INDEX IF NOT EXISTS "JobBudgetLine_jobId_idx" ON "JobBudgetLine"("jobId");

CREATE INDEX IF NOT EXISTS "CostItem_stageId_idx" ON "CostItem"("stageId");
CREATE INDEX IF NOT EXISTS "CostItemAttachment_companyId_idx" ON "CostItemAttachment"("companyId");
CREATE INDEX IF NOT EXISTS "CostItemAttachment_costItemId_idx" ON "CostItemAttachment"("costItemId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
    ALTER TABLE "Engineer" ADD CONSTRAINT "Engineer_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "RateCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "JobBudgetLine" ADD CONSTRAINT "JobBudgetLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "JobBudgetLine" ADD CONSTRAINT "JobBudgetLine_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JobStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "CostItemAttachment" ADD CONSTRAINT "CostItemAttachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "CostItemAttachment" ADD CONSTRAINT "CostItemAttachment_costItemId_fkey" FOREIGN KEY ("costItemId") REFERENCES "CostItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
