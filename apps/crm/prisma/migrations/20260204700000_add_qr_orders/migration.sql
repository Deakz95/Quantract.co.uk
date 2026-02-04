-- CreateTable
CREATE TABLE "QrOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amountPence" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fulfilledAt" TIMESTAMP(3),

    CONSTRAINT "QrOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QrOrder_stripeSessionId_key" ON "QrOrder"("stripeSessionId");

-- CreateIndex
CREATE INDEX "QrOrder_companyId_idx" ON "QrOrder"("companyId");

-- CreateIndex
CREATE INDEX "QrOrder_companyId_status_idx" ON "QrOrder"("companyId", "status");

-- AddForeignKey
ALTER TABLE "QrOrder" ADD CONSTRAINT "QrOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
