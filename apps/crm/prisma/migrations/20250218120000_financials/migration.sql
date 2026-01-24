ALTER TABLE "Engineer" ADD COLUMN "rateCardId" TEXT;

CREATE TABLE "RateCard" (
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

CREATE TABLE "JobBudgetLine" (
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

ALTER TABLE "SupplierBill" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE "SupplierBill" ADD COLUMN "postedAt" TIMESTAMP(3);

ALTER TABLE "CostItem" ADD COLUMN "stageId" TEXT;
ALTER TABLE "CostItem" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "CostItem" ADD COLUMN "lockStatus" TEXT NOT NULL DEFAULT 'open';
ALTER TABLE "CostItem" ADD COLUMN "incurredAt" TIMESTAMP(3);
ALTER TABLE "CostItem" ADD COLUMN "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE TABLE "CostItemAttachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "costItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostItemAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RateCard_companyId_idx" ON "RateCard"("companyId");
CREATE UNIQUE INDEX "RateCard_companyId_name_key" ON "RateCard"("companyId", "name");

CREATE INDEX "JobBudgetLine_companyId_idx" ON "JobBudgetLine"("companyId");
CREATE INDEX "JobBudgetLine_jobId_idx" ON "JobBudgetLine"("jobId");

CREATE INDEX "CostItem_stageId_idx" ON "CostItem"("stageId");
CREATE INDEX "CostItemAttachment_companyId_idx" ON "CostItemAttachment"("companyId");
CREATE INDEX "CostItemAttachment_costItemId_idx" ON "CostItemAttachment"("costItemId");

ALTER TABLE "Engineer" ADD CONSTRAINT "Engineer_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "RateCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JobBudgetLine" ADD CONSTRAINT "JobBudgetLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "JobBudgetLine" ADD CONSTRAINT "JobBudgetLine_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JobStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CostItemAttachment" ADD CONSTRAINT "CostItemAttachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CostItemAttachment" ADD CONSTRAINT "CostItemAttachment_costItemId_fkey" FOREIGN KEY ("costItemId") REFERENCES "CostItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
