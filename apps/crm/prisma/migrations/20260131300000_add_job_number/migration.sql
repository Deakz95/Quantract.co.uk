-- Add jobNumber to Job
ALTER TABLE "Job" ADD COLUMN "jobNumber" INTEGER;

-- Add nextJobNumber to Company
ALTER TABLE "Company" ADD COLUMN "nextJobNumber" INTEGER NOT NULL DEFAULT 1;

-- Backfill existing jobs: assign sequential numbers per company ordered by createdAt
WITH numbered AS (
  SELECT "id", "companyId", ROW_NUMBER() OVER (PARTITION BY "companyId" ORDER BY "createdAt" ASC) AS rn
  FROM "Job"
)
UPDATE "Job" SET "jobNumber" = numbered.rn
FROM numbered WHERE "Job"."id" = numbered."id";

-- Set nextJobNumber on each company to max(jobNumber) + 1
UPDATE "Company" SET "nextJobNumber" = sub.next_num
FROM (
  SELECT "companyId", COALESCE(MAX("jobNumber"), 0) + 1 AS next_num
  FROM "Job"
  GROUP BY "companyId"
) sub
WHERE "Company"."id" = sub."companyId";

-- Add unique constraint
CREATE UNIQUE INDEX "Job_companyId_jobNumber_key" ON "Job"("companyId", "jobNumber");
