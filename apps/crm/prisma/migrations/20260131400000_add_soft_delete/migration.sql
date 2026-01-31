-- Add soft-delete support to core entities
ALTER TABLE "Client" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Quote" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Job" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Indexes for filtering active (non-deleted) records
CREATE INDEX "Client_companyId_deletedAt_idx" ON "Client"("companyId", "deletedAt");
CREATE INDEX "Quote_companyId_deletedAt_idx" ON "Quote"("companyId", "deletedAt");
CREATE INDEX "Job_companyId_deletedAt_idx" ON "Job"("companyId", "deletedAt");
CREATE INDEX "Invoice_companyId_deletedAt_idx" ON "Invoice"("companyId", "deletedAt");
