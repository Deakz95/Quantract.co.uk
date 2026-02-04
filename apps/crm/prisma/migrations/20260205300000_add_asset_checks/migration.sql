-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "identifier" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Asset_companyId_type_idx" ON "Asset"("companyId", "type");

-- CreateIndex
CREATE INDEX "Asset_companyId_status_idx" ON "Asset"("companyId", "status");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: extend ScheduledCheck with assetId, documentId, idempotencyKey
ALTER TABLE "ScheduledCheck" ADD COLUMN "assetId" TEXT,
ADD COLUMN "documentId" TEXT,
ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE INDEX "ScheduledCheck_assetId_idx" ON "ScheduledCheck"("assetId");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "ScheduledCheck_companyId_idempotencyKey_key" ON "ScheduledCheck"("companyId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "ScheduledCheck" ADD CONSTRAINT "ScheduledCheck_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
