-- Migration: Add missing models for production readiness
-- Supplier, Subcontractor, and fix Expense attachment handling

-- Create Supplier table
CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- Create Subcontractor table
CREATE TABLE IF NOT EXISTS "Subcontractor" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trade" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "dayRate" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcontractor_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "Supplier_companyId_idx" ON "Supplier"("companyId");
CREATE INDEX IF NOT EXISTS "Subcontractor_companyId_idx" ON "Subcontractor"("companyId");

-- Add foreign keys
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subcontractor" ADD CONSTRAINT "Subcontractor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
