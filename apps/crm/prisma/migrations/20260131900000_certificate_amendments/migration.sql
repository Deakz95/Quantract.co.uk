-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN "amendsCertificateId" TEXT;

-- CreateIndex
CREATE INDEX "Certificate_amendsCertificateId_idx" ON "Certificate"("amendsCertificateId");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_amendsCertificateId_fkey" FOREIGN KEY ("amendsCertificateId") REFERENCES "Certificate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
