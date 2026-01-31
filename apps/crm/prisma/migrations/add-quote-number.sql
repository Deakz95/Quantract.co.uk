-- Add quoteNumber to Quote table
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "quoteNumber" TEXT;

-- Add quote numbering fields to Company table
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "quoteNumberPrefix" TEXT NOT NULL DEFAULT 'QUO-';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "nextQuoteNumber" INTEGER NOT NULL DEFAULT 1;

-- Add quote numbering fields to LegalEntity table
ALTER TABLE "LegalEntity" ADD COLUMN IF NOT EXISTS "quoteNumberPrefix" TEXT NOT NULL DEFAULT 'QUO-';
ALTER TABLE "LegalEntity" ADD COLUMN IF NOT EXISTS "nextQuoteNumber" INTEGER NOT NULL DEFAULT 1;
