-- Add missing auth tables required by password login + sessions

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "companyId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'User_companyId_fkey'
  ) THEN
    ALTER TABLE "User"
    ADD CONSTRAINT "User_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS "User_role_email_key" ON "User" ("role", "email");
CREATE INDEX IF NOT EXISTS "User_companyId_idx" ON "User" ("companyId");


CREATE TABLE IF NOT EXISTS "AuthSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sid" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthSession_sid_key" ON "AuthSession" ("sid");
CREATE INDEX IF NOT EXISTS "AuthSession_userId_idx" ON "AuthSession" ("userId");
CREATE INDEX IF NOT EXISTS "AuthSession_companyId_idx" ON "AuthSession" ("companyId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AuthSession_userId_fkey'
  ) THEN
    ALTER TABLE "AuthSession"
    ADD CONSTRAINT "AuthSession_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AuthSession_companyId_fkey'
  ) THEN
    ALTER TABLE "AuthSession"
    ADD CONSTRAINT "AuthSession_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END$$;


CREATE TABLE IF NOT EXISTS "MagicLinkToken" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "token" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),

  CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "MagicLinkToken_token_key" ON "MagicLinkToken" ("token");
CREATE INDEX IF NOT EXISTS "MagicLinkToken_email_idx" ON "MagicLinkToken" ("email");
