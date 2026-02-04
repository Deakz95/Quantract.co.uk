-- CreateTable
CREATE TABLE "QrTag" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "status" TEXT NOT NULL DEFAULT 'available',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QrTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QrAssignment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "qrTagId" TEXT NOT NULL,
    "certificateId" TEXT,
    "documentId" TEXT,
    "assignedByUserId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "QrAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QrTag_code_key" ON "QrTag"("code");

-- CreateIndex
CREATE INDEX "QrTag_companyId_idx" ON "QrTag"("companyId");

-- CreateIndex
CREATE INDEX "QrTag_companyId_status_idx" ON "QrTag"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "QrAssignment_qrTagId_key" ON "QrAssignment"("qrTagId");

-- CreateIndex
CREATE INDEX "QrAssignment_companyId_idx" ON "QrAssignment"("companyId");

-- CreateIndex
CREATE INDEX "QrAssignment_certificateId_idx" ON "QrAssignment"("certificateId");

-- CreateIndex
CREATE INDEX "QrAssignment_documentId_idx" ON "QrAssignment"("documentId");

-- AddForeignKey
ALTER TABLE "QrTag" ADD CONSTRAINT "QrTag_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrAssignment" ADD CONSTRAINT "QrAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrAssignment" ADD CONSTRAINT "QrAssignment_qrTagId_fkey" FOREIGN KEY ("qrTagId") REFERENCES "QrTag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrAssignment" ADD CONSTRAINT "QrAssignment_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrAssignment" ADD CONSTRAINT "QrAssignment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QrAssignment" ADD CONSTRAINT "QrAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
