-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "InvoiceVariation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceVariation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "InvoiceVariation_companyId_idx" ON "InvoiceVariation"("companyId");
CREATE INDEX IF NOT EXISTS "InvoiceVariation_invoiceId_idx" ON "InvoiceVariation"("invoiceId");
CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceVariation_companyId_variationId_key" ON "InvoiceVariation"("companyId", "variationId");

-- AddForeignKey (idempotent)
DO $$ BEGIN
    ALTER TABLE "InvoiceVariation" ADD CONSTRAINT "InvoiceVariation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "InvoiceVariation" ADD CONSTRAINT "InvoiceVariation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "InvoiceVariation" ADD CONSTRAINT "InvoiceVariation_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
