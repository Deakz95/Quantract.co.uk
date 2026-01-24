-- CreateTable
CREATE TABLE IF NOT EXISTS "QuoteTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "vatRate" REAL NOT NULL DEFAULT 0.20,
    "items" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuoteTemplate_category_idx" ON "QuoteTemplate"("category");
CREATE INDEX IF NOT EXISTS "QuoteTemplate_name_idx" ON "QuoteTemplate"("name");
