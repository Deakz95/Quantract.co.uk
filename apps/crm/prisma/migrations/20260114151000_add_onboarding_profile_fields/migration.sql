-- Migration: Add onboarding/profile fields (production safe)

-- User profile gate + fields
ALTER TABLE IF EXISTS "User"
  ADD COLUMN IF NOT EXISTS "profileComplete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "address1" TEXT,
  ADD COLUMN IF NOT EXISTS "address2" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "county" TEXT,
  ADD COLUMN IF NOT EXISTS "postcode" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyName" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyRelationship" TEXT;

-- Engineer address + emergency contact
ALTER TABLE IF EXISTS "Engineer"
  ADD COLUMN IF NOT EXISTS "address1" TEXT,
  ADD COLUMN IF NOT EXISTS "address2" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "county" TEXT,
  ADD COLUMN IF NOT EXISTS "postcode" TEXT,
  ADD COLUMN IF NOT EXISTS "country" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyName" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "emergencyRelationship" TEXT;

-- Client service/billing addresses
ALTER TABLE IF EXISTS "Client"
  ADD COLUMN IF NOT EXISTS "serviceAddress1" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceAddress2" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceCity" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceCounty" TEXT,
  ADD COLUMN IF NOT EXISTS "servicePostcode" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceCountry" TEXT,
  ADD COLUMN IF NOT EXISTS "billingAddress1" TEXT,
  ADD COLUMN IF NOT EXISTS "billingAddress2" TEXT,
  ADD COLUMN IF NOT EXISTS "billingCity" TEXT,
  ADD COLUMN IF NOT EXISTS "billingCounty" TEXT,
  ADD COLUMN IF NOT EXISTS "billingPostcode" TEXT,
  ADD COLUMN IF NOT EXISTS "billingCountry" TEXT,
  ADD COLUMN IF NOT EXISTS "billingSameAsService" BOOLEAN NOT NULL DEFAULT true;
