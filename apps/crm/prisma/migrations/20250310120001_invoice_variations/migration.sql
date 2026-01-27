CREATE TABLE "InvoiceVariation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceVariation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvoiceVariation_companyId_idx" ON "InvoiceVariation"("companyId");
CREATE INDEX "InvoiceVariation_invoiceId_idx" ON "InvoiceVariation"("invoiceId");
CREATE UNIQUE INDEX "InvoiceVariation_companyId_variationId_key" ON "InvoiceVariation"("companyId", "variationId");

ALTER TABLE "InvoiceVariation" ADD CONSTRAINT "InvoiceVariation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceVariation" ADD CONSTRAINT "InvoiceVariation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceVariation" ADD CONSTRAINT "InvoiceVariation_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
