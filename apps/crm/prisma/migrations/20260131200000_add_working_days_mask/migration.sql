-- Add working days mask (bitmask) to Company. Default 31 = Mon-Fri.
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "workingDaysMask" INTEGER NOT NULL DEFAULT 31;
