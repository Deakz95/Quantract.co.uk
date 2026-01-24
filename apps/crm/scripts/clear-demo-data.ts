import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDemoData() {
  try {
    console.log('🧹 Clearing demo data...\n');

    // Get the admin user's company ID to preserve it
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' },
      select: { companyId: true, email: true },
    });

    if (!adminUser) {
      console.log('❌ No admin user found. Please create an admin first.');
      return;
    }

    console.log(`✅ Preserving admin user: ${adminUser.email}`);
    console.log(`✅ Preserving company: ${adminUser.companyId}\n`);

    // Delete all data EXCEPT the admin user's company and the admin user itself
    // Order matters due to foreign key constraints

    // 1. Delete invoices
    const invoices = await prisma.invoice.deleteMany({
      where: { companyId: { not: adminUser.companyId } },
    });
    console.log(`🗑️  Deleted ${invoices.count} invoices`);

    // 2. Delete quotes
    const quotes = await prisma.quote.deleteMany({
      where: { companyId: { not: adminUser.companyId } },
    });
    console.log(`🗑️  Deleted ${quotes.count} quotes`);

    // 3. Delete jobs
    const jobs = await prisma.job.deleteMany({
      where: { companyId: { not: adminUser.companyId } },
    });
    console.log(`🗑️  Deleted ${jobs.count} jobs`);

    // 4. Delete certificates
    const certificates = await prisma.certificate.deleteMany({
      where: { companyId: { not: adminUser.companyId } },
    });
    console.log(`🗑️  Deleted ${certificates.count} certificates`);

    // 5. Delete clients
    const clients = await prisma.client.deleteMany({
      where: { companyId: { not: adminUser.companyId } },
    });
    console.log(`🗑️  Deleted ${clients.count} clients`);

    // 6. Delete engineers (non-admin users)
    const engineers = await prisma.user.deleteMany({
      where: {
        AND: [
          { companyId: { not: adminUser.companyId } },
          { role: { not: 'admin' } },
        ],
      },
    });
    console.log(`🗑️  Deleted ${engineers.count} engineers/other users`);

    // 7. Delete other companies
    const companies = await prisma.company.deleteMany({
      where: { id: { not: adminUser.companyId } },
    });
    console.log(`🗑️  Deleted ${companies.count} other companies`);

    // 8. Delete old sessions (except current admin)
    const sessions = await prisma.authSession.deleteMany({
      where: {
        user: {
          role: { not: 'admin' },
        },
      },
    });
    console.log(`🗑️  Deleted ${sessions.count} old sessions`);

    // 9. Delete enquiries
    const enquiries = await prisma.enquiry.deleteMany({});
    console.log(`🗑️  Deleted ${enquiries.count} enquiries`);

    // 10. Delete time entries
    const timeEntries = await prisma.timeEntry.deleteMany({
      where: { companyId: { not: adminUser.companyId } },
    });
    console.log(`🗑️  Deleted ${timeEntries.count} time entries`);

    // 11. Delete cost items
    const costItems = await prisma.costItem.deleteMany({
      where: { companyId: { not: adminUser.companyId } },
    });
    console.log(`🗑️  Deleted ${costItems.count} cost items`);

    // 12. Delete variations
    const variations = await prisma.variation.deleteMany({
      where: { companyId: { not: adminUser.companyId } },
    });
    console.log(`🗑️  Deleted ${variations.count} variations`);

    console.log('\n✅ Demo data cleared successfully!');
    console.log('✅ Your admin account and company are preserved.');
    console.log('\n🎉 You can now start adding your real data!');

  } catch (error) {
    console.error('❌ Error clearing demo data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearDemoData();
