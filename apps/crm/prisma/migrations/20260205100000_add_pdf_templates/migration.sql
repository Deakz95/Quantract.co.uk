-- CreateTable
CREATE TABLE "PdfTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfTemplateVersion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "layout" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdfTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PdfTemplate_companyId_docType_name_key" ON "PdfTemplate"("companyId", "docType", "name");

-- CreateIndex
CREATE INDEX "PdfTemplate_companyId_docType_idx" ON "PdfTemplate"("companyId", "docType");

-- CreateIndex
CREATE UNIQUE INDEX "PdfTemplateVersion_templateId_version_key" ON "PdfTemplateVersion"("templateId", "version");

-- CreateIndex
CREATE INDEX "PdfTemplateVersion_templateId_idx" ON "PdfTemplateVersion"("templateId");

-- AddForeignKey
ALTER TABLE "PdfTemplate" ADD CONSTRAINT "PdfTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfTemplateVersion" ADD CONSTRAINT "PdfTemplateVersion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PdfTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
