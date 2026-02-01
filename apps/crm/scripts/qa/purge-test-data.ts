/**
 * Purge stale E2E / QA test data from the database.
 * Deletes clients matching test naming patterns or the AUTOMATED_QA tag,
 * and cascades to related records.
 * Usage: npm run qa:purge-test-data
 */
import { PrismaClient } from "@prisma/client";

/** Must match the QA_TAG constant used in fixture creation scripts. */
const QA_TAG = "AUTOMATED_QA";

async function main() {
  const prisma = new PrismaClient();

  try {
    // Find test clients by legacy name/email patterns OR the QA_TAG
    const testClients = await prisma.client.findMany({
      where: {
        OR: [
          { name: { startsWith: "E2E Test" } },
          { name: { startsWith: "ZZZ QA Smoke" } },
          { name: { contains: `[${QA_TAG}]` } },
          { email: { startsWith: "e2e-", endsWith: "@test.com" } },
        ],
      },
      select: { id: true, name: true, email: true },
    });

    if (testClients.length === 0) {
      console.log("No test clients found. Nothing to purge.");
      return;
    }

    console.log(`Found ${testClients.length} test client(s) to purge:`);
    for (const c of testClients) {
      console.log(`  - ${c.name} (${c.email})`);
    }

    const clientIds = testClients.map((c: { id: string }) => c.id);

    // Delete related records in dependency order
    const timeEntries = await prisma.timeEntry.deleteMany({ where: { job: { clientId: { in: clientIds } } } }).catch(() => ({ count: 0 }));
    console.log(`  Deleted ${timeEntries.count} time entries`);

    const invoices = await prisma.invoice.deleteMany({ where: { clientId: { in: clientIds } } }).catch(() => ({ count: 0 }));
    console.log(`  Deleted ${invoices.count} invoices`);

    const agreements = await prisma.agreement.deleteMany({ where: { quote: { clientId: { in: clientIds } } } }).catch(() => ({ count: 0 }));
    console.log(`  Deleted ${agreements.count} agreements`);

    const quotes = await prisma.quote.deleteMany({ where: { clientId: { in: clientIds } } }).catch(() => ({ count: 0 }));
    console.log(`  Deleted ${quotes.count} quotes`);

    const jobs = await prisma.job.deleteMany({ where: { clientId: { in: clientIds } } }).catch(() => ({ count: 0 }));
    console.log(`  Deleted ${jobs.count} jobs`);

    const contacts = await prisma.contact.deleteMany({ where: { clientId: { in: clientIds } } }).catch(() => ({ count: 0 }));
    console.log(`  Deleted ${contacts.count} contacts`);

    const sites = await prisma.site.deleteMany({ where: { clientId: { in: clientIds } } }).catch(() => ({ count: 0 }));
    console.log(`  Deleted ${sites.count} sites`);

    const clients = await prisma.client.deleteMany({ where: { id: { in: clientIds } } });
    console.log(`  Deleted ${clients.count} clients`);

    // Also purge orphaned records tagged with QA_TAG but not linked to a matched client
    const orphanQuotes = await prisma.quote.deleteMany({ where: { clientName: { contains: `[${QA_TAG}]` } } }).catch(() => ({ count: 0 }));
    if (orphanQuotes.count) console.log(`  Deleted ${orphanQuotes.count} orphan tagged quotes`);

    const orphanJobs = await prisma.job.deleteMany({ where: { title: { contains: `[${QA_TAG}]` } } }).catch(() => ({ count: 0 }));
    if (orphanJobs.count) console.log(`  Deleted ${orphanJobs.count} orphan tagged jobs`);

    const orphanSites = await prisma.site.deleteMany({ where: { name: { contains: `[${QA_TAG}]` } } }).catch(() => ({ count: 0 }));
    if (orphanSites.count) console.log(`  Deleted ${orphanSites.count} orphan tagged sites`);

    console.log("Purge complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Purge failed:", err);
  process.exit(1);
});
