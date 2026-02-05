-- AlterTable: Add soft-delete support to ScheduleEntry
ALTER TABLE "ScheduleEntry" ADD COLUMN "deletedAt" TIMESTAMP(3);
