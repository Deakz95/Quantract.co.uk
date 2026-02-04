-- CreateTable
CREATE TABLE IF NOT EXISTS "CompanyStorageUsage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bytesUsed" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyStorageUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CompanyStorageUsage_companyId_key" ON "CompanyStorageUsage"("companyId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CompanyStorageUsage_companyId_fkey'
  ) THEN
    ALTER TABLE "CompanyStorageUsage"
      ADD CONSTRAINT "CompanyStorageUsage_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
