-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brandName" TEXT NOT NULL DEFAULT 'Quantract',
    "brandTagline" TEXT,
    "logoKey" TEXT,
    "defaultVatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "invoiceNumberPrefix" TEXT NOT NULL DEFAULT 'INV-',
    "nextInvoiceNumber" INTEGER NOT NULL DEFAULT 1,
    "certificateNumberPrefix" TEXT NOT NULL DEFAULT 'CERT-',
    "nextCertificateNumber" INTEGER NOT NULL DEFAULT 1,
    "onboardedAt" TIMESTAMP(3),
    "defaultPaymentTermsDays" INTEGER NOT NULL DEFAULT 14,
    "autoChaseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'inactive',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "xeroConnected" BOOLEAN NOT NULL DEFAULT false,
    "xeroTenantId" TEXT,
    "xeroAccessToken" TEXT,
    "xeroRefreshToken" TEXT,
    "xeroTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "providerRef" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBill" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "reference" TEXT,
    "billDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "postedAt" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pdfKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierBillLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vatRate" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "totalExVat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyUser" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "county" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "paymentTermsDays" INTEGER,
    "disableAutoChase" BOOLEAN NOT NULL DEFAULT false,
    "xeroContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT,
    "address1" TEXT,
    "address2" TEXT,
    "city" TEXT,
    "county" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "notes" TEXT,
    "paymentTermsDays" INTEGER,
    "disableAutoChase" BOOLEAN NOT NULL DEFAULT false,
    "xeroContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "clientId" TEXT,
    "siteId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "siteAddress" TEXT,
    "notes" TEXT,
    "vatRate" DOUBLE PRECISION NOT NULL,
    "items" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRevision" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "quoteSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signedAt" TIMESTAMP(3),
    "signerName" TEXT,
    "signerEmail" TEXT,
    "signerIp" TEXT,
    "signerUserAgent" TEXT,
    "certificateHash" TEXT,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "clientId" TEXT,
    "quoteId" TEXT,
    "jobId" TEXT,
    "variationId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'stage',
    "stageName" TEXT,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "vat" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'gbp',
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "xeroInvoiceId" TEXT,
    "xeroSyncStatus" TEXT NOT NULL DEFAULT 'not_synced',
    "xeroLastSyncAt" TIMESTAMP(3),
    "xeroLastError" TEXT,
    "paymentProvider" TEXT,
    "paymentUrl" TEXT,
    "paymentRef" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceAttachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceVariation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceChase" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "InvoiceChase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "actor" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quoteId" TEXT,
    "agreementId" TEXT,
    "invoiceId" TEXT,
    "jobId" TEXT,
    "certificateId" TEXT,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Engineer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "costRatePerHour" DOUBLE PRECISION,
    "chargeRatePerHour" DOUBLE PRECISION,
    "rateCardId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Engineer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateCard" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "costRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chargeRatePerHour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "quoteId" TEXT,
    "clientId" TEXT,
    "siteId" TEXT,
    "engineerId" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "budgetSubtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetVat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "budgetTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobBudgetLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'quote',
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobBudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "engineerId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobStage" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "Variation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "quoteId" TEXT,
    "jobId" TEXT,
    "stageId" TEXT,
    "title" TEXT NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "vatRate" DOUBLE PRECISION NOT NULL,
    "items" JSONB NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vat" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "approvedBy" TEXT,

    CONSTRAINT "Variation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariationAttachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "variationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariationAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "engineerId" TEXT NOT NULL,
    "timesheetId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timesheet" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "engineerId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "stageId" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "lockStatus" TEXT NOT NULL DEFAULT 'open',
    "supplier" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "markupPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "incurredAt" TIMESTAMP(3),
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostItemAttachment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "costItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostItemAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT,
    "siteId" TEXT,
    "clientId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "issuedAt" TIMESTAMP(3),
    "inspectorName" TEXT,
    "inspectorEmail" TEXT,
    "dataVersion" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL DEFAULT '{}',
    "completedAt" TIMESTAMP(3),
    "pdfKey" TEXT,
    "signedName" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateTestResult" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "certificateId" TEXT NOT NULL,
    "circuitRef" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_JobTimesheets" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JobTimesheets_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayment_companyId_idx" ON "InvoicePayment"("companyId");

-- CreateIndex
CREATE INDEX "SupplierBill_jobId_idx" ON "SupplierBill"("jobId");

-- CreateIndex
CREATE INDEX "SupplierBill_companyId_idx" ON "SupplierBill"("companyId");

-- CreateIndex
CREATE INDEX "SupplierBillLine_billId_idx" ON "SupplierBillLine"("billId");

-- CreateIndex
CREATE INDEX "SupplierBillLine_companyId_idx" ON "SupplierBillLine"("companyId");

-- CreateIndex
CREATE INDEX "CompanyUser_email_idx" ON "CompanyUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyUser_companyId_email_key" ON "CompanyUser"("companyId", "email");

-- CreateIndex
CREATE INDEX "Client_companyId_idx" ON "Client"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_companyId_email_key" ON "Client"("companyId", "email");

-- CreateIndex
CREATE INDEX "Site_companyId_idx" ON "Site"("companyId");

-- CreateIndex
CREATE INDEX "Site_clientId_idx" ON "Site"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_token_key" ON "Quote"("token");

-- CreateIndex
CREATE INDEX "Quote_companyId_idx" ON "Quote"("companyId");

-- CreateIndex
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");

-- CreateIndex
CREATE INDEX "QuoteRevision_companyId_idx" ON "QuoteRevision"("companyId");

-- CreateIndex
CREATE INDEX "QuoteRevision_quoteId_idx" ON "QuoteRevision"("quoteId");

-- CreateIndex
CREATE INDEX "QuoteRevision_createdAt_idx" ON "QuoteRevision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRevision_quoteId_version_key" ON "QuoteRevision"("quoteId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_token_key" ON "Agreement"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_quoteId_key" ON "Agreement"("quoteId");

-- CreateIndex
CREATE INDEX "Agreement_companyId_idx" ON "Agreement"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_token_key" ON "Invoice"("token");

-- CreateIndex
CREATE INDEX "Invoice_companyId_idx" ON "Invoice"("companyId");

-- CreateIndex
CREATE INDEX "Invoice_jobId_idx" ON "Invoice"("jobId");

-- CreateIndex
CREATE INDEX "Invoice_variationId_idx" ON "Invoice"("variationId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_companyId_invoiceNumber_key" ON "Invoice"("companyId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "InvoiceAttachment_companyId_idx" ON "InvoiceAttachment"("companyId");

-- CreateIndex
CREATE INDEX "InvoiceAttachment_invoiceId_idx" ON "InvoiceAttachment"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceVariation_companyId_idx" ON "InvoiceVariation"("companyId");

-- CreateIndex
CREATE INDEX "InvoiceVariation_invoiceId_idx" ON "InvoiceVariation"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceVariation_companyId_variationId_key" ON "InvoiceVariation"("companyId", "variationId");

-- CreateIndex
CREATE INDEX "InvoiceChase_companyId_idx" ON "InvoiceChase"("companyId");

-- CreateIndex
CREATE INDEX "InvoiceChase_invoiceId_idx" ON "InvoiceChase"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceChase_companyId_invoiceId_kind_key" ON "InvoiceChase"("companyId", "invoiceId", "kind");

-- CreateIndex
CREATE INDEX "AuditEvent_companyId_idx" ON "AuditEvent"("companyId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Engineer_companyId_idx" ON "Engineer"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Engineer_companyId_email_key" ON "Engineer"("companyId", "email");

-- CreateIndex
CREATE INDEX "RateCard_companyId_idx" ON "RateCard"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "RateCard_companyId_name_key" ON "RateCard"("companyId", "name");

-- CreateIndex
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_scheduledAt_idx" ON "Job"("scheduledAt");

-- CreateIndex
CREATE INDEX "JobBudgetLine_companyId_idx" ON "JobBudgetLine"("companyId");

-- CreateIndex
CREATE INDEX "JobBudgetLine_jobId_idx" ON "JobBudgetLine"("jobId");

-- CreateIndex
CREATE INDEX "ScheduleEntry_companyId_idx" ON "ScheduleEntry"("companyId");

-- CreateIndex
CREATE INDEX "ScheduleEntry_engineerId_startAt_idx" ON "ScheduleEntry"("engineerId", "startAt");

-- CreateIndex
CREATE INDEX "ScheduleEntry_jobId_idx" ON "ScheduleEntry"("jobId");

-- CreateIndex
CREATE INDEX "JobStage_companyId_idx" ON "JobStage"("companyId");

-- CreateIndex
CREATE INDEX "JobStage_jobId_idx" ON "JobStage"("jobId");

-- CreateIndex
CREATE INDEX "JobStage_status_idx" ON "JobStage"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JobStage_jobId_sortOrder_key" ON "JobStage"("jobId", "sortOrder");

-- CreateIndex
CREATE INDEX "SnagItem_companyId_idx" ON "SnagItem"("companyId");

-- CreateIndex
CREATE INDEX "SnagItem_jobId_idx" ON "SnagItem"("jobId");

-- CreateIndex
CREATE INDEX "SnagItem_status_idx" ON "SnagItem"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Variation_token_key" ON "Variation"("token");

-- CreateIndex
CREATE INDEX "Variation_companyId_idx" ON "Variation"("companyId");

-- CreateIndex
CREATE INDEX "Variation_status_idx" ON "Variation"("status");

-- CreateIndex
CREATE INDEX "Variation_stageId_idx" ON "Variation"("stageId");

-- CreateIndex
CREATE INDEX "VariationAttachment_companyId_idx" ON "VariationAttachment"("companyId");

-- CreateIndex
CREATE INDEX "VariationAttachment_variationId_idx" ON "VariationAttachment"("variationId");

-- CreateIndex
CREATE INDEX "TimeEntry_companyId_idx" ON "TimeEntry"("companyId");

-- CreateIndex
CREATE INDEX "TimeEntry_jobId_idx" ON "TimeEntry"("jobId");

-- CreateIndex
CREATE INDEX "TimeEntry_engineerId_idx" ON "TimeEntry"("engineerId");

-- CreateIndex
CREATE INDEX "TimeEntry_startedAt_idx" ON "TimeEntry"("startedAt");

-- CreateIndex
CREATE INDEX "Timesheet_companyId_idx" ON "Timesheet"("companyId");

-- CreateIndex
CREATE INDEX "Timesheet_status_idx" ON "Timesheet"("status");

-- CreateIndex
CREATE INDEX "Timesheet_weekStart_idx" ON "Timesheet"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "Timesheet_companyId_engineerId_weekStart_key" ON "Timesheet"("companyId", "engineerId", "weekStart");

-- CreateIndex
CREATE INDEX "CostItem_companyId_idx" ON "CostItem"("companyId");

-- CreateIndex
CREATE INDEX "CostItem_jobId_idx" ON "CostItem"("jobId");

-- CreateIndex
CREATE INDEX "CostItem_stageId_idx" ON "CostItem"("stageId");

-- CreateIndex
CREATE INDEX "CostItem_type_idx" ON "CostItem"("type");

-- CreateIndex
CREATE INDEX "CostItemAttachment_companyId_idx" ON "CostItemAttachment"("companyId");

-- CreateIndex
CREATE INDEX "CostItemAttachment_costItemId_idx" ON "CostItemAttachment"("costItemId");

-- CreateIndex
CREATE INDEX "Certificate_companyId_idx" ON "Certificate"("companyId");

-- CreateIndex
CREATE INDEX "Certificate_jobId_idx" ON "Certificate"("jobId");

-- CreateIndex
CREATE INDEX "Certificate_siteId_idx" ON "Certificate"("siteId");

-- CreateIndex
CREATE INDEX "Certificate_clientId_idx" ON "Certificate"("clientId");

-- CreateIndex
CREATE INDEX "CertificateTestResult_companyId_idx" ON "CertificateTestResult"("companyId");

-- CreateIndex
CREATE INDEX "CertificateTestResult_certificateId_idx" ON "CertificateTestResult"("certificateId");

-- CreateIndex
CREATE INDEX "_JobTimesheets_B_index" ON "_JobTimesheets"("B");

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBill" ADD CONSTRAINT "SupplierBill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBillLine" ADD CONSTRAINT "SupplierBillLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBillLine" ADD CONSTRAINT "SupplierBillLine_billId_fkey" FOREIGN KEY ("billId") REFERENCES "SupplierBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierBillLine" ADD CONSTRAINT "SupplierBillLine_costItemId_fkey" FOREIGN KEY ("costItemId") REFERENCES "CostItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyUser" ADD CONSTRAINT "CompanyUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRevision" ADD CONSTRAINT "QuoteRevision_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRevision" ADD CONSTRAINT "QuoteRevision_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceAttachment" ADD CONSTRAINT "InvoiceAttachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceAttachment" ADD CONSTRAINT "InvoiceAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceVariation" ADD CONSTRAINT "InvoiceVariation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceVariation" ADD CONSTRAINT "InvoiceVariation_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceVariation" ADD CONSTRAINT "InvoiceVariation_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceChase" ADD CONSTRAINT "InvoiceChase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceChase" ADD CONSTRAINT "InvoiceChase_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engineer" ADD CONSTRAINT "Engineer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Engineer" ADD CONSTRAINT "Engineer_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "RateCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateCard" ADD CONSTRAINT "RateCard_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "Engineer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobBudgetLine" ADD CONSTRAINT "JobBudgetLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobBudgetLine" ADD CONSTRAINT "JobBudgetLine_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "Engineer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStage" ADD CONSTRAINT "JobStage_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobStage" ADD CONSTRAINT "JobStage_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnagItem" ADD CONSTRAINT "SnagItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnagItem" ADD CONSTRAINT "SnagItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variation" ADD CONSTRAINT "Variation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variation" ADD CONSTRAINT "Variation_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variation" ADD CONSTRAINT "Variation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Variation" ADD CONSTRAINT "Variation_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JobStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariationAttachment" ADD CONSTRAINT "VariationAttachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariationAttachment" ADD CONSTRAINT "VariationAttachment_variationId_fkey" FOREIGN KEY ("variationId") REFERENCES "Variation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "Engineer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeEntry" ADD CONSTRAINT "TimeEntry_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "Timesheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "Engineer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostItem" ADD CONSTRAINT "CostItem_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "JobStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostItemAttachment" ADD CONSTRAINT "CostItemAttachment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostItemAttachment" ADD CONSTRAINT "CostItemAttachment_costItemId_fkey" FOREIGN KEY ("costItemId") REFERENCES "CostItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateTestResult" ADD CONSTRAINT "CertificateTestResult_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateTestResult" ADD CONSTRAINT "CertificateTestResult_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobTimesheets" ADD CONSTRAINT "_JobTimesheets_A_fkey" FOREIGN KEY ("A") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobTimesheets" ADD CONSTRAINT "_JobTimesheets_B_fkey" FOREIGN KEY ("B") REFERENCES "Timesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

