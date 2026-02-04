-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "supplierName" TEXT,
ADD COLUMN "receiptDate" TIMESTAMP(3),
ADD COLUMN "subtotal" INTEGER,
ADD COLUMN "vat" INTEGER,
ADD COLUMN "total" INTEGER,
ADD COLUMN "documentId" TEXT,
ADD COLUMN "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Expense_documentId_idx" ON "Expense"("documentId");

-- CreateIndex
CREATE INDEX "Expense_createdByUserId_idx" ON "Expense"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
