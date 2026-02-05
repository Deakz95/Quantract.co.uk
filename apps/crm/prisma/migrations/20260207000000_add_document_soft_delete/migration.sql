-- AlterTable: Add soft-delete support to Document
ALTER TABLE "Document" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex: Fast filtering for active/deleted documents per company
CREATE INDEX "Document_companyId_deletedAt_idx" ON "Document"("companyId", "deletedAt");
