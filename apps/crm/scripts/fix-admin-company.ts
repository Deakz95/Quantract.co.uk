import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAdminCompany() {
  try {
    // Find admin users without a company
    const adminsWithoutCompany = await prisma.user.findMany({
      where: {
        role: 'admin',
        companyId: null,
      },
    });

    if (adminsWithoutCompany.length === 0) {
      console.log('✅ All admin users already have a company');
      return;
    }

    console.log(`Found ${adminsWithoutCompany.length} admin user(s) without a company`);

    for (const admin of adminsWithoutCompany) {
      // Create a company for this admin
      const companyName = admin.name || 'My Company';
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now();

      const company = await prisma.company.create({
        data: {
          name: companyName,
          slug,
          brandName: companyName,
          brandTagline: '',
          themePrimary: '#0f172a',
          themeAccent: '#38bdf8',
          themeBg: '#ffffff',
          themeText: '#0f172a',
        },
      });

      // Update the admin user with the company ID
      await prisma.user.update({
        where: { id: admin.id },
        data: { companyId: company.id },
      });

      console.log(`✅ Created company ${company.id} and linked to admin user ${admin.email}`);
    }

    console.log('✅ All admin users now have companies!');
  } catch (error) {
    console.error('❌ Error fixing admin companies:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixAdminCompany();
