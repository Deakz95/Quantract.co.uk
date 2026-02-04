-- CreateTable
CREATE TABLE "ToolOutput" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolSlug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inputsJson" JSONB NOT NULL,
    "outputsJson" JSONB NOT NULL,
    "jobId" TEXT,
    "clientId" TEXT,
    "certificateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolOutput_companyId_toolSlug_idx" ON "ToolOutput"("companyId", "toolSlug");
CREATE INDEX "ToolOutput_companyId_jobId_idx" ON "ToolOutput"("companyId", "jobId");
CREATE INDEX "ToolOutput_companyId_clientId_idx" ON "ToolOutput"("companyId", "clientId");
CREATE INDEX "ToolOutput_companyId_certificateId_idx" ON "ToolOutput"("companyId", "certificateId");
CREATE INDEX "ToolOutput_companyId_createdAt_idx" ON "ToolOutput"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "ToolOutput" ADD CONSTRAINT "ToolOutput_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
