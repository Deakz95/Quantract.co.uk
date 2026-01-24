-- Add trial and usage tracking fields to Company
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "trialStartedAt" TIMESTAMP;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "quotesThisMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "invoicesThisMonth" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "usageResetAt" TIMESTAMP;

-- Update default plan from 'free' to 'trial'
UPDATE "Company" SET plan = 'trial' WHERE plan = 'free';

-- Comment: usageResetAt tracks when monthly counters were last reset
-- Comment: trialStartedAt is set on first quote/invoice/job creation
