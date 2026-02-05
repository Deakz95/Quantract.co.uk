-- AlterTable: add schedule config fields to Engineer
ALTER TABLE "Engineer" ADD COLUMN "workStartHour" INTEGER NOT NULL DEFAULT 8;
ALTER TABLE "Engineer" ADD COLUMN "workEndHour" INTEGER NOT NULL DEFAULT 17;
ALTER TABLE "Engineer" ADD COLUMN "breakMinutes" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Engineer" ADD COLUMN "maxJobsPerDay" INTEGER;
ALTER TABLE "Engineer" ADD COLUMN "travelBufferMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: add status field to ScheduleEntry
ALTER TABLE "ScheduleEntry" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'scheduled';

-- CreateTable: RecurringSchedule
CREATE TABLE "RecurringSchedule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT,
    "engineerId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 120,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringSchedule_companyId_idx" ON "RecurringSchedule"("companyId");
CREATE INDEX "RecurringSchedule_engineerId_idx" ON "RecurringSchedule"("engineerId");
