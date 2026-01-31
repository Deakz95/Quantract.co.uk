-- Add working days per month setting to Company
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "workingDaysPerMonth" INTEGER NOT NULL DEFAULT 22;
