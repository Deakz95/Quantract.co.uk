-- AlterTable: Add recurrence fields to ChecklistTemplate
ALTER TABLE "ChecklistTemplate" ADD COLUMN "recurrenceType" TEXT;
ALTER TABLE "ChecklistTemplate" ADD COLUMN "recurrenceDay" INTEGER;
ALTER TABLE "ChecklistTemplate" ADD COLUMN "assignToRole" TEXT;

-- CreateTable
CREATE TABLE "ScheduledCheck" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "engineerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledCheckItem" (
    "id" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "notes" TEXT,

    CONSTRAINT "ScheduledCheckItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledCheck_companyId_status_idx" ON "ScheduledCheck"("companyId", "status");
CREATE INDEX "ScheduledCheck_companyId_dueAt_idx" ON "ScheduledCheck"("companyId", "dueAt");
CREATE INDEX "ScheduledCheck_companyId_engineerId_idx" ON "ScheduledCheck"("companyId", "engineerId");
CREATE INDEX "ScheduledCheck_templateId_idx" ON "ScheduledCheck"("templateId");
CREATE INDEX "ScheduledCheckItem_checkId_sortOrder_idx" ON "ScheduledCheckItem"("checkId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ScheduledCheck" ADD CONSTRAINT "ScheduledCheck_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScheduledCheck" ADD CONSTRAINT "ScheduledCheck_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledCheckItem" ADD CONSTRAINT "ScheduledCheckItem_checkId_fkey" FOREIGN KEY ("checkId") REFERENCES "ScheduledCheck"("id") ON DELETE CASCADE ON UPDATE CASCADE;
