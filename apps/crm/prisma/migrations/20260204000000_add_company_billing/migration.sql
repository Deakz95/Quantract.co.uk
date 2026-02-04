-- CreateTable
CREATE TABLE "CompanyBilling" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'trial',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'inactive',
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "trialStartedAt" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "enabledModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "extraUsers" INTEGER NOT NULL DEFAULT 0,
    "extraEntities" INTEGER NOT NULL DEFAULT 0,
    "extraStorageMB" INTEGER NOT NULL DEFAULT 0,
    "lastWebhookEventId" TEXT,
    "lastWebhookAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyBilling_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyBilling_companyId_key" ON "CompanyBilling"("companyId");

-- CreateIndex
CREATE INDEX "CompanyBilling_stripeCustomerId_idx" ON "CompanyBilling"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "CompanyBilling_stripeSubscriptionId_idx" ON "CompanyBilling"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "CompanyBilling" ADD CONSTRAINT "CompanyBilling_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
