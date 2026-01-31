-- AlterTable
ALTER TABLE "Company" ADD COLUMN "markJobCompletedOnCertIssue" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "InvoiceCertificate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceCertificate_invoiceId_certificateId_key" ON "InvoiceCertificate"("invoiceId", "certificateId");

-- CreateIndex
CREATE INDEX "InvoiceCertificate_companyId_idx" ON "InvoiceCertificate"("companyId");

-- CreateIndex
CREATE INDEX "InvoiceCertificate_invoiceId_idx" ON "InvoiceCertificate"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceCertificate_certificateId_idx" ON "InvoiceCertificate"("certificateId");

-- AddForeignKey
ALTER TABLE "InvoiceCertificate" ADD CONSTRAINT "InvoiceCertificate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceCertificate" ADD CONSTRAINT "InvoiceCertificate_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceCertificate" ADD CONSTRAINT "InvoiceCertificate_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
