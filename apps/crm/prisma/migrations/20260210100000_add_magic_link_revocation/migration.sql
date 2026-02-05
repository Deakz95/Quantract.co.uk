-- AlterTable: Add revokedAt column to MagicLinkToken for explicit token revocation
ALTER TABLE "MagicLinkToken" ADD COLUMN "revokedAt" TIMESTAMP(3);

-- CreateIndex: Fast lookups for token validation with revocation check
CREATE INDEX "MagicLinkToken_tokenHash_revokedAt_idx" ON "MagicLinkToken"("tokenHash", "revokedAt");
