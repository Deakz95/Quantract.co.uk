-- AlterTable: Add externalUrl to Document
ALTER TABLE "Document" ADD COLUMN "externalUrl" TEXT;

-- CreateTable: CompanyStorageSettings
CREATE TABLE "CompanyStorageSettings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'internal',
    "externalBaseUrl" TEXT,
    "externalNamingPattern" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyStorageSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyStorageSettings_companyId_key" ON "CompanyStorageSettings"("companyId");

-- AddForeignKey
ALTER TABLE "CompanyStorageSettings" ADD CONSTRAINT "CompanyStorageSettings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
