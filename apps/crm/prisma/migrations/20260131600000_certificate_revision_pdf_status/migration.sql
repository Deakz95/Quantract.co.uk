-- AlterTable: add pdfGeneratedAt to CertificateRevision
ALTER TABLE "CertificateRevision" ADD COLUMN "pdfGeneratedAt" TIMESTAMP(3);
