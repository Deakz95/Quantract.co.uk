-- CreateTable
CREATE TABLE "OpsAuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "result" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "actorId" TEXT,
    "approvalToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpsAuditLog_action_idx" ON "OpsAuditLog"("action");

-- CreateIndex
CREATE INDEX "OpsAuditLog_createdAt_idx" ON "OpsAuditLog"("createdAt");
