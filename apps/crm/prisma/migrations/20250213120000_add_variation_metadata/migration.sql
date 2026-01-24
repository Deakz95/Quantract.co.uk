ALTER TABLE "Variation" ADD COLUMN IF NOT EXISTS "stageId" TEXT;
ALTER TABLE "Variation" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Variation" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);
ALTER TABLE "Variation" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Variation" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;

CREATE TABLE IF NOT EXISTS "VariationAttachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VariationAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Variation_stageId_idx" ON "Variation"("stageId");
CREATE INDEX IF NOT EXISTS "VariationAttachment_companyId_idx" ON "VariationAttachment"("companyId");
CREATE INDEX IF NOT EXISTS "VariationAttachment_variationId_idx" ON "VariationAttachment"("variationId");

DO $$
BEGIN
  ALTER TABLE "Variation" ADD CONSTRAINT "Variation_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JobStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "VariationAttachment" ADD CONSTRAINT "VariationAttachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "VariationAttachment" ADD CONSTRAINT "VariationAttachment_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
