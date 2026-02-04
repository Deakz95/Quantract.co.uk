-- CreateTable
CREATE TABLE "EntitlementOverride" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "EntitlementOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntitlementOverride_companyId_key_idx" ON "EntitlementOverride"("companyId", "key");

-- CreateIndex
CREATE INDEX "EntitlementOverride_companyId_revokedAt_idx" ON "EntitlementOverride"("companyId", "revokedAt");

-- AddForeignKey
ALTER TABLE "EntitlementOverride" ADD CONSTRAINT "EntitlementOverride_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
