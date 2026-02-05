-- AlterTable
ALTER TABLE "CertificateRevision" ADD COLUMN "templateVersionId" TEXT;

-- AddForeignKey
ALTER TABLE "CertificateRevision" ADD CONSTRAINT "CertificateRevision_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "PdfTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
