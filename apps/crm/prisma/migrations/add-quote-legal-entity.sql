-- Add legalEntityId to Quote
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "legalEntityId" TEXT;

-- Add FK constraint
DO $$ BEGIN
  ALTER TABLE "Quote" ADD CONSTRAINT "Quote_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS "Quote_legalEntityId_idx" ON "Quote"("legalEntityId");

-- Add unique constraint for entity-scoped quote numbers
-- (allows nulls — only enforces uniqueness when both are non-null)
DO $$ BEGIN
  ALTER TABLE "Quote" ADD CONSTRAINT "Quote_legalEntityId_quoteNumber_key" UNIQUE ("legalEntityId", "quoteNumber");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
