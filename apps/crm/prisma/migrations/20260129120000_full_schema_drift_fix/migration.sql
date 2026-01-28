-- =============================================================================
-- Corrective Migration: Full Schema Drift Fix
-- =============================================================================
-- This migration fixes schema drift between the Prisma schema and the actual
-- database state. All statements are idempotent using IF NOT EXISTS guards and
-- DO $$ exception blocks so the migration can be safely re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE "ExpenseStatus" AS ENUM ('UPLOADED', 'PARSED', 'CONFIRMED', 'POSTED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'CONFIRMED', 'RECEIVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "StockMovementType" AS ENUM ('RECEIVED', 'USED', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OFFICE', 'ENGINEER', 'FINANCE');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationEventKey" AS ENUM (
        'appointmentBooked',
        'appointmentReminder24h',
        'appointmentReminder2h',
        'engineerOnTheWay',
        'jobCompleted',
        'quoteSent',
        'quoteReminder',
        'quoteAccepted',
        'invoiceIssued',
        'invoiceOverdue',
        'invoiceFinalReminder',
        'paymentReceived',
        'certificateIssued',
        'portalInvite'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationLogStatus" AS ENUM ('sent', 'skipped', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationSkipReason" AS ENUM (
        'noConsent',
        'noCredits',
        'quietHours',
        'rateLimited',
        'missingPhone',
        'missingEmail',
        'disabled',
        'providerError'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------------------------
-- 2. TABLES (ordered to respect FK dependencies)
-- ---------------------------------------------------------------------------

-- 2.1 LegalEntity (depends on Company)
CREATE TABLE IF NOT EXISTS "LegalEntity" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "companyNumber" TEXT,
    "vatNumber" TEXT,
    "registeredAddress1" TEXT,
    "registeredAddress2" TEXT,
    "registeredCity" TEXT,
    "registeredCounty" TEXT,
    "registeredPostcode" TEXT,
    "registeredCountry" TEXT DEFAULT 'United Kingdom',
    "pdfFooterLine1" TEXT,
    "pdfFooterLine2" TEXT,
    "invoiceNumberPrefix" TEXT NOT NULL DEFAULT 'INV-',
    "nextInvoiceNumber" INT NOT NULL DEFAULT 1,
    "certificateNumberPrefix" TEXT NOT NULL DEFAULT 'CERT-',
    "nextCertificateNumber" INT NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- 2.2 ServiceLine (depends on Company, LegalEntity)
CREATE TABLE IF NOT EXISTS "ServiceLine" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "defaultLegalEntityId" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceLine_pkey" PRIMARY KEY ("id")
);

-- 2.3 Expense (depends on Company, Supplier)
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT,
    "supplierId" TEXT,
    "amount" INT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "expenseDate" TIMESTAMP(3),
    "status" "ExpenseStatus" NOT NULL DEFAULT 'UPLOADED',
    "attachmentKey" TEXT,
    "parsedData" JSONB,
    "category" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- 2.4 Invite (depends on Company)
CREATE TABLE IF NOT EXISTS "Invite" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- 2.5 MfaSession (depends on User)
CREATE TABLE IF NOT EXISTS "MfaSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "challengeToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "MfaSession_pkey" PRIMARY KEY ("id")
);

-- 2.6 NotificationPreference (depends on User)
CREATE TABLE IF NOT EXISTS "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- 2.7 PurchaseOrder (depends on Company, Supplier, Job)
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "jobId" TEXT,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "poNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- 2.8 PurchaseOrderLine (depends on PurchaseOrder)
CREATE TABLE IF NOT EXISTS "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "qty" INT NOT NULL,
    "unitCost" INT NOT NULL,
    "total" INT NOT NULL,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- 2.9 StockItem (depends on Company)
CREATE TABLE IF NOT EXISTS "StockItem" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "defaultCost" INT,
    "reorderLevel" INT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- 2.10 StockMovement (depends on Company, StockItem)
CREATE TABLE IF NOT EXISTS "StockMovement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "qtyDelta" INT NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- 2.11 UserPermission (depends on Company, User)
CREATE TABLE IF NOT EXISTS "UserPermission" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- 2.12 impersonation_logs (depends on User, Company)
CREATE TABLE IF NOT EXISTS "impersonation_logs" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "reason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "actionsTaken" JSONB NOT NULL DEFAULT '[]',
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "companyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "impersonation_logs_pkey" PRIMARY KEY ("id")
);

-- 2.13 ChecklistTemplate (depends on Company)
CREATE TABLE IF NOT EXISTS "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INT NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- 2.14 ChecklistTemplateItem (depends on ChecklistTemplate)
CREATE TABLE IF NOT EXISTS "ChecklistTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistTemplateItem_pkey" PRIMARY KEY ("id")
);

-- 2.15 Task (depends on Company, User, Job, Client, self-ref)
CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" TIMESTAMP(3),
    "assigneeId" TEXT,
    "jobId" TEXT,
    "clientId" TEXT,
    "parentTaskId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- 2.16 JobChecklist (depends on Company, Job, ChecklistTemplate)
CREATE TABLE IF NOT EXISTS "JobChecklist" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "templateId" TEXT,
    "templateSnapshotId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "attachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attachedBy" TEXT,

    CONSTRAINT "JobChecklist_pkey" PRIMARY KEY ("id")
);

-- 2.17 JobChecklistItem (depends on JobChecklist)
CREATE TABLE IF NOT EXISTS "JobChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "completedByName" TEXT,
    "notes" TEXT,

    CONSTRAINT "JobChecklistItem_pkey" PRIMARY KEY ("id")
);

-- 2.18 Comment (depends on Company, Task, Job, User)
CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "taskId" TEXT,
    "jobId" TEXT,
    "content" TEXT NOT NULL,
    "internalOnly" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- 2.19 Mention (depends on Company, Task, Comment, User)
CREATE TABLE IF NOT EXISTS "Mention" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "taskId" TEXT,
    "commentId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Mention_pkey" PRIMARY KEY ("id")
);

-- 2.20 NotificationRule (depends on Company)
CREATE TABLE IF NOT EXISTS "NotificationRule" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "eventKey" "NotificationEventKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);

-- 2.21 NotificationTemplate (depends on Company)
CREATE TABLE IF NOT EXISTS "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "eventKey" "NotificationEventKey" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- 2.22 NotificationLog (depends on Company)
CREATE TABLE IF NOT EXISTS "NotificationLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "eventKey" "NotificationEventKey" NOT NULL,
    "recipient" TEXT NOT NULL,
    "clientId" TEXT,
    "jobId" TEXT,
    "invoiceId" TEXT,
    "quoteId" TEXT,
    "certificateId" TEXT,
    "status" "NotificationLogStatus" NOT NULL,
    "skipReason" "NotificationSkipReason",
    "errorMessage" TEXT,
    "cost" INT,
    "segments" INT,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 3. ALTER EXISTING TABLES — add missing columns
-- ---------------------------------------------------------------------------

-- 3.1 Company columns
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "autoChaseFirstDays" INT NOT NULL DEFAULT 7;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "autoChaseSecondDays" INT NOT NULL DEFAULT 14;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "autoChaseThirdDays" INT NOT NULL DEFAULT 21;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "quoteValidityDays" INT NOT NULL DEFAULT 30;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "termsAndConditions" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "defaultLegalEntityId" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "defaultServiceLineId" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsProvider" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsSenderId" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsApiKey" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsApiSecret" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsRequireConsent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsQuietHoursEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsQuietFrom" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsQuietTo" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsMaxPerClientPerDay" INT NOT NULL DEFAULT 3;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsMaxPerJobPerDay" INT NOT NULL DEFAULT 5;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "smsCredits" INT NOT NULL DEFAULT 0;

-- 3.2 Certificate columns
ALTER TABLE "Certificate" ADD COLUMN IF NOT EXISTS "legalEntityId" TEXT;

-- 3.3 Client columns
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "smsOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "smsOptInAt" TIMESTAMP(3);

-- 3.4 Job columns
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "serviceLineId" TEXT;
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "performingLegalEntityId" TEXT;

-- 3.5 Invoice columns
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "legalEntityId" TEXT;

-- 3.6 MagicLinkToken columns
ALTER TABLE "MagicLinkToken" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "MagicLinkToken" ADD COLUMN IF NOT EXISTS "tokenHash" TEXT;
ALTER TABLE "MagicLinkToken" ADD COLUMN IF NOT EXISTS "ip" TEXT;

-- ---------------------------------------------------------------------------
-- 4. UNIQUE CONSTRAINTS (on new tables)
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS "LegalEntity_companyId_displayName_key" ON "LegalEntity"("companyId", "displayName");
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceLine_companyId_slug_key" ON "ServiceLine"("companyId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Invite_token_key" ON "Invite"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "MfaSession_challengeToken_key" ON "MfaSession"("challengeToken");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_channel_category_key" ON "NotificationPreference"("userId", "channel", "category");
CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_companyId_poNumber_key" ON "PurchaseOrder"("companyId", "poNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPermission_companyId_userId_key_key" ON "UserPermission"("companyId", "userId", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationRule_companyId_channel_eventKey_key" ON "NotificationRule"("companyId", "channel", "eventKey");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationTemplate_companyId_channel_eventKey_key" ON "NotificationTemplate"("companyId", "channel", "eventKey");
CREATE UNIQUE INDEX IF NOT EXISTS "MagicLinkToken_tokenHash_key" ON "MagicLinkToken"("tokenHash");

-- ---------------------------------------------------------------------------
-- 5. INDEXES (new tables)
-- ---------------------------------------------------------------------------

-- LegalEntity
CREATE INDEX IF NOT EXISTS "LegalEntity_companyId_idx" ON "LegalEntity"("companyId");
CREATE INDEX IF NOT EXISTS "LegalEntity_isDefault_idx" ON "LegalEntity"("isDefault");
CREATE INDEX IF NOT EXISTS "LegalEntity_status_idx" ON "LegalEntity"("status");

-- ServiceLine
CREATE INDEX IF NOT EXISTS "ServiceLine_companyId_idx" ON "ServiceLine"("companyId");
CREATE INDEX IF NOT EXISTS "ServiceLine_isDefault_idx" ON "ServiceLine"("isDefault");
CREATE INDEX IF NOT EXISTS "ServiceLine_status_idx" ON "ServiceLine"("status");

-- Expense
CREATE INDEX IF NOT EXISTS "Expense_companyId_status_idx" ON "Expense"("companyId", "status");

-- Invite
CREATE INDEX IF NOT EXISTS "Invite_companyId_email_idx" ON "Invite"("companyId", "email");
CREATE INDEX IF NOT EXISTS "Invite_companyId_role_idx" ON "Invite"("companyId", "role");

-- MfaSession
CREATE INDEX IF NOT EXISTS "MfaSession_expiresAt_idx" ON "MfaSession"("expiresAt");
CREATE INDEX IF NOT EXISTS "MfaSession_userId_status_idx" ON "MfaSession"("userId", "status");

-- NotificationPreference
CREATE INDEX IF NOT EXISTS "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- StockItem
CREATE INDEX IF NOT EXISTS "StockItem_companyId_isActive_idx" ON "StockItem"("companyId", "isActive");

-- StockMovement
CREATE INDEX IF NOT EXISTS "StockMovement_companyId_stockItemId_idx" ON "StockMovement"("companyId", "stockItemId");

-- UserPermission
CREATE INDEX IF NOT EXISTS "UserPermission_companyId_userId_idx" ON "UserPermission"("companyId", "userId");

-- impersonation_logs
CREATE INDEX IF NOT EXISTS "impersonation_logs_adminUserId_idx" ON "impersonation_logs"("adminUserId");
CREATE INDEX IF NOT EXISTS "impersonation_logs_companyId_idx" ON "impersonation_logs"("companyId");
CREATE INDEX IF NOT EXISTS "impersonation_logs_endedAt_idx" ON "impersonation_logs"("endedAt");
CREATE INDEX IF NOT EXISTS "impersonation_logs_targetUserId_idx" ON "impersonation_logs"("targetUserId");

-- ChecklistTemplate
CREATE INDEX IF NOT EXISTS "ChecklistTemplate_companyId_idx" ON "ChecklistTemplate"("companyId");
CREATE INDEX IF NOT EXISTS "ChecklistTemplate_isActive_idx" ON "ChecklistTemplate"("isActive");

-- ChecklistTemplateItem
CREATE INDEX IF NOT EXISTS "ChecklistTemplateItem_templateId_sortOrder_idx" ON "ChecklistTemplateItem"("templateId", "sortOrder");

-- JobChecklist
CREATE INDEX IF NOT EXISTS "JobChecklist_companyId_idx" ON "JobChecklist"("companyId");
CREATE INDEX IF NOT EXISTS "JobChecklist_jobId_idx" ON "JobChecklist"("jobId");

-- JobChecklistItem
CREATE INDEX IF NOT EXISTS "JobChecklistItem_checklistId_sortOrder_idx" ON "JobChecklistItem"("checklistId", "sortOrder");
CREATE INDEX IF NOT EXISTS "JobChecklistItem_status_idx" ON "JobChecklistItem"("status");

-- Task
CREATE INDEX IF NOT EXISTS "Task_companyId_idx" ON "Task"("companyId");
CREATE INDEX IF NOT EXISTS "Task_assigneeId_idx" ON "Task"("assigneeId");
CREATE INDEX IF NOT EXISTS "Task_jobId_idx" ON "Task"("jobId");
CREATE INDEX IF NOT EXISTS "Task_clientId_idx" ON "Task"("clientId");
CREATE INDEX IF NOT EXISTS "Task_parentTaskId_idx" ON "Task"("parentTaskId");
CREATE INDEX IF NOT EXISTS "Task_status_idx" ON "Task"("status");
CREATE INDEX IF NOT EXISTS "Task_dueDate_idx" ON "Task"("dueDate");

-- Comment
CREATE INDEX IF NOT EXISTS "Comment_companyId_idx" ON "Comment"("companyId");
CREATE INDEX IF NOT EXISTS "Comment_taskId_idx" ON "Comment"("taskId");
CREATE INDEX IF NOT EXISTS "Comment_jobId_idx" ON "Comment"("jobId");
CREATE INDEX IF NOT EXISTS "Comment_createdAt_idx" ON "Comment"("createdAt");

-- Mention
CREATE INDEX IF NOT EXISTS "Mention_companyId_idx" ON "Mention"("companyId");
CREATE INDEX IF NOT EXISTS "Mention_userId_notified_idx" ON "Mention"("userId", "notified");
CREATE INDEX IF NOT EXISTS "Mention_taskId_idx" ON "Mention"("taskId");
CREATE INDEX IF NOT EXISTS "Mention_commentId_idx" ON "Mention"("commentId");

-- NotificationRule
CREATE INDEX IF NOT EXISTS "NotificationRule_companyId_idx" ON "NotificationRule"("companyId");

-- NotificationTemplate
CREATE INDEX IF NOT EXISTS "NotificationTemplate_companyId_idx" ON "NotificationTemplate"("companyId");

-- NotificationLog
CREATE INDEX IF NOT EXISTS "NotificationLog_companyId_idx" ON "NotificationLog"("companyId");
CREATE INDEX IF NOT EXISTS "NotificationLog_companyId_createdAt_idx" ON "NotificationLog"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "NotificationLog_companyId_channel_idx" ON "NotificationLog"("companyId", "channel");
CREATE INDEX IF NOT EXISTS "NotificationLog_clientId_idx" ON "NotificationLog"("clientId");
CREATE INDEX IF NOT EXISTS "NotificationLog_status_idx" ON "NotificationLog"("status");

-- Indexes for new columns on existing tables
CREATE INDEX IF NOT EXISTS "Certificate_legalEntityId_idx" ON "Certificate"("legalEntityId");
CREATE INDEX IF NOT EXISTS "Job_serviceLineId_idx" ON "Job"("serviceLineId");
CREATE INDEX IF NOT EXISTS "Job_performingLegalEntityId_idx" ON "Job"("performingLegalEntityId");
CREATE INDEX IF NOT EXISTS "Invoice_legalEntityId_idx" ON "Invoice"("legalEntityId");
CREATE INDEX IF NOT EXISTS "MagicLinkToken_userId_expiresAt_idx" ON "MagicLinkToken"("userId", "expiresAt");

-- ---------------------------------------------------------------------------
-- 6. FOREIGN KEY CONSTRAINTS
-- ---------------------------------------------------------------------------

-- LegalEntity
DO $$ BEGIN
    ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ServiceLine
DO $$ BEGIN
    ALTER TABLE "ServiceLine" ADD CONSTRAINT "ServiceLine_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ServiceLine" ADD CONSTRAINT "ServiceLine_defaultLegalEntityId_fkey" FOREIGN KEY ("defaultLegalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Expense
DO $$ BEGIN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Expense" ADD CONSTRAINT "Expense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Invite
DO $$ BEGIN
    ALTER TABLE "Invite" ADD CONSTRAINT "Invite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- MfaSession
DO $$ BEGIN
    ALTER TABLE "MfaSession" ADD CONSTRAINT "MfaSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- NotificationPreference
DO $$ BEGIN
    ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- PurchaseOrderLine
DO $$ BEGIN
    ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- StockMovement
DO $$ BEGIN
    ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- impersonation_logs
DO $$ BEGIN
    ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "impersonation_logs" ADD CONSTRAINT "impersonation_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ChecklistTemplate
DO $$ BEGIN
    ALTER TABLE "ChecklistTemplate" ADD CONSTRAINT "ChecklistTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ChecklistTemplateItem
DO $$ BEGIN
    ALTER TABLE "ChecklistTemplateItem" ADD CONSTRAINT "ChecklistTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- JobChecklist
DO $$ BEGIN
    ALTER TABLE "JobChecklist" ADD CONSTRAINT "JobChecklist_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "JobChecklist" ADD CONSTRAINT "JobChecklist_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "JobChecklist" ADD CONSTRAINT "JobChecklist_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ChecklistTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- JobChecklistItem
DO $$ BEGIN
    ALTER TABLE "JobChecklistItem" ADD CONSTRAINT "JobChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "JobChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Task
DO $$ BEGIN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Comment
DO $$ BEGIN
    ALTER TABLE "Comment" ADD CONSTRAINT "Comment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Comment" ADD CONSTRAINT "Comment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Comment" ADD CONSTRAINT "Comment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Mention
DO $$ BEGIN
    ALTER TABLE "Mention" ADD CONSTRAINT "Mention_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Mention" ADD CONSTRAINT "Mention_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Mention" ADD CONSTRAINT "Mention_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Mention" ADD CONSTRAINT "Mention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- NotificationRule
DO $$ BEGIN
    ALTER TABLE "NotificationRule" ADD CONSTRAINT "NotificationRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- NotificationTemplate
DO $$ BEGIN
    ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- NotificationLog
DO $$ BEGIN
    ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- FKs for new columns on existing tables

DO $$ BEGIN
    ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_serviceLineId_fkey" FOREIGN KEY ("serviceLineId") REFERENCES "ServiceLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Job" ADD CONSTRAINT "Job_performingLegalEntityId_fkey" FOREIGN KEY ("performingLegalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
