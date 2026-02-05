-- AlterTable: Add avatar document reference to Engineer
ALTER TABLE "Engineer" ADD COLUMN "avatarDocumentId" TEXT;

-- CreateTable: EngineerQualification
CREATE TABLE "EngineerQualification" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "engineerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "issuer" TEXT,
    "certificateNumber" TEXT,
    "issueDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "documentId" TEXT,
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngineerQualification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EngineerQualification_companyId_idx" ON "EngineerQualification"("companyId");

-- CreateIndex
CREATE INDEX "EngineerQualification_engineerId_idx" ON "EngineerQualification"("engineerId");

-- CreateIndex
CREATE INDEX "EngineerQualification_expiryDate_idx" ON "EngineerQualification"("expiryDate");

-- AddForeignKey
ALTER TABLE "Engineer" ADD CONSTRAINT "Engineer_avatarDocumentId_fkey" FOREIGN KEY ("avatarDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineerQualification" ADD CONSTRAINT "EngineerQualification_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineerQualification" ADD CONSTRAINT "EngineerQualification_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "Engineer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngineerQualification" ADD CONSTRAINT "EngineerQualification_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
