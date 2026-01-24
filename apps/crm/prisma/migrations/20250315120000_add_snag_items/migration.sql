CREATE TABLE "SnagItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SnagItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SnagItem_companyId_idx" ON "SnagItem"("companyId");
CREATE INDEX "SnagItem_jobId_idx" ON "SnagItem"("jobId");
CREATE INDEX "SnagItem_status_idx" ON "SnagItem"("status");

ALTER TABLE "SnagItem" ADD CONSTRAINT "SnagItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SnagItem" ADD CONSTRAINT "SnagItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
