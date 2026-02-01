/**
 * One-shot script: backfill quoteNumber for any quotes that are missing one.
 * Usage: npx tsx scripts/qa/backfill-quote-numbers.ts
 */
import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  try {
    // Find all quotes with null quoteNumber, grouped by company
    const quotes = await prisma.quote.findMany({
      where: { quoteNumber: null, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true, companyId: true, legalEntityId: true, createdAt: true },
    });

    if (quotes.length === 0) {
      console.log("No quotes missing a quoteNumber. Nothing to do.");
      return;
    }

    console.log(`Found ${quotes.length} quote(s) missing a quoteNumber.`);

    for (const q of quotes) {
      // Use company counter to allocate a number
      const co = await prisma.company.findUnique({
        where: { id: q.companyId },
        select: { quoteNumberPrefix: true, nextQuoteNumber: true },
      });

      const prefix = co?.quoteNumberPrefix || "QUO-";
      const num = co?.nextQuoteNumber || 1;
      const quoteNumber = `${prefix}${String(num).padStart(6, "0")}`;

      await prisma.quote.update({
        where: { id: q.id },
        data: { quoteNumber },
      });

      await prisma.company.update({
        where: { id: q.companyId },
        data: { nextQuoteNumber: num + 1 },
      });

      console.log(`  Assigned ${quoteNumber} to quote ${q.id}`);
    }

    console.log("Done.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
