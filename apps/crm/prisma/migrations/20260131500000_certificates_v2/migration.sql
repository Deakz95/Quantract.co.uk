-- AlterTable: add v2 columns to Certificate
ALTER TABLE "Certificate" ADD COLUMN "verificationToken" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "verificationRevokedAt" TIMESTAMP(3);
ALTER TABLE "Certificate" ADD COLUMN "currentRevision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Certificate" ADD COLUMN "outcome" TEXT;
ALTER TABLE "Certificate" ADD COLUMN "outcomeReason" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_verificationToken_key" ON "Certificate"("verificationToken");
CREATE INDEX "Certificate_companyId_certificateNumber_idx" ON "Certificate"("companyId", "certificateNumber");

-- CreateTable: CertificateRevision
CREATE TABLE "CertificateRevision" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "signingHash" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "pdfKey" TEXT,
    "pdfChecksum" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "issuedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CertificateRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CertificateRevision_certificateId_revision_key" ON "CertificateRevision"("certificateId", "revision");
CREATE INDEX "CertificateRevision_companyId_idx" ON "CertificateRevision"("companyId");
CREATE INDEX "CertificateRevision_certificateId_idx" ON "CertificateRevision"("certificateId");
ALTER TABLE "CertificateRevision" ADD CONSTRAINT "CertificateRevision_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CertificateRevision" ADD CONSTRAINT "CertificateRevision_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: CertificateObservation
CREATE TABLE "CertificateObservation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "regulation" TEXT,
    "fixGuidance" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CertificateObservation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CertificateObservation_certificateId_idx" ON "CertificateObservation"("certificateId");
CREATE INDEX "CertificateObservation_companyId_idx" ON "CertificateObservation"("companyId");
CREATE INDEX "CertificateObservation_code_idx" ON "CertificateObservation"("code");
ALTER TABLE "CertificateObservation" ADD CONSTRAINT "CertificateObservation_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CertificateObservation" ADD CONSTRAINT "CertificateObservation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: CertificateChecklist
CREATE TABLE "CertificateChecklist" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CertificateChecklist_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CertificateChecklist_certificateId_section_idx" ON "CertificateChecklist"("certificateId", "section");
CREATE INDEX "CertificateChecklist_companyId_idx" ON "CertificateChecklist"("companyId");
ALTER TABLE "CertificateChecklist" ADD CONSTRAINT "CertificateChecklist_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CertificateChecklist" ADD CONSTRAINT "CertificateChecklist_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: CertificateSignatureRecord
CREATE TABLE "CertificateSignatureRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT,
    "signatureText" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "qualification" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CertificateSignatureRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CertificateSignatureRecord_certificateId_role_idx" ON "CertificateSignatureRecord"("certificateId", "role");
CREATE INDEX "CertificateSignatureRecord_companyId_idx" ON "CertificateSignatureRecord"("companyId");
ALTER TABLE "CertificateSignatureRecord" ADD CONSTRAINT "CertificateSignatureRecord_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CertificateSignatureRecord" ADD CONSTRAINT "CertificateSignatureRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: CertificateAttachment
CREATE TABLE "CertificateAttachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CertificateAttachment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CertificateAttachment_certificateId_idx" ON "CertificateAttachment"("certificateId");
CREATE INDEX "CertificateAttachment_companyId_idx" ON "CertificateAttachment"("companyId");
ALTER TABLE "CertificateAttachment" ADD CONSTRAINT "CertificateAttachment_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CertificateAttachment" ADD CONSTRAINT "CertificateAttachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
