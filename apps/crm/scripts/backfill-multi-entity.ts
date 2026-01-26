/**
 * Backfill script for Multi-Entity Billing
 *
 * This script:
 * 1. Creates a default LegalEntity for each existing Company
 * 2. Creates a default ServiceLine for each Company
 * 3. Backfills existing invoices, certificates, and jobs with the new entity/service line references
 *
 * Run with: npx tsx scripts/backfill-multi-entity.ts
 * Or: npx ts-node --esm scripts/backfill-multi-entity.ts
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

function generateId(): string {
  return randomUUID();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function backfillMultiEntity() {
  console.log('🚀 Starting Multi-Entity Billing backfill...\n');

  try {
    // Get all companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        brandName: true,
        pdfFooterLine1: true,
        pdfFooterLine2: true,
        invoiceNumberPrefix: true,
        nextInvoiceNumber: true,
        certificateNumberPrefix: true,
        nextCertificateNumber: true,
        defaultLegalEntityId: true,
        defaultServiceLineId: true,
      },
    });

    console.log(`Found ${companies.length} companies to process\n`);

    for (const company of companies) {
      console.log(`\n📦 Processing company: ${company.name} (${company.id})`);

      // Check if company already has a default legal entity
      let defaultLegalEntityId = company.defaultLegalEntityId;

      if (!defaultLegalEntityId) {
        // Check if any legal entity exists for this company
        const existingEntity = await prisma.legalEntity.findFirst({
          where: { companyId: company.id, isDefault: true },
        });

        if (existingEntity) {
          defaultLegalEntityId = existingEntity.id;
          console.log(`  ✓ Found existing default legal entity: ${existingEntity.displayName}`);
        } else {
          // Create default legal entity from company settings
          const legalEntity = await prisma.legalEntity.create({
            data: {
              id: generateId(),
              companyId: company.id,
              displayName: company.brandName || company.name,
              legalName: company.name,
              pdfFooterLine1: company.pdfFooterLine1,
              pdfFooterLine2: company.pdfFooterLine2,
              invoiceNumberPrefix: company.invoiceNumberPrefix,
              nextInvoiceNumber: company.nextInvoiceNumber,
              certificateNumberPrefix: company.certificateNumberPrefix,
              nextCertificateNumber: company.nextCertificateNumber,
              isDefault: true,
              status: 'active',
              updatedAt: new Date(),
            },
          });
          defaultLegalEntityId = legalEntity.id;
          console.log(`  ✓ Created default legal entity: ${legalEntity.displayName}`);
        }
      } else {
        console.log(`  ✓ Company already has default legal entity`);
      }

      // Check if company already has a default service line
      let defaultServiceLineId = company.defaultServiceLineId;

      if (!defaultServiceLineId) {
        // Check if any service line exists for this company
        const existingServiceLine = await prisma.serviceLine.findFirst({
          where: { companyId: company.id, isDefault: true },
        });

        if (existingServiceLine) {
          defaultServiceLineId = existingServiceLine.id;
          console.log(`  ✓ Found existing default service line: ${existingServiceLine.name}`);
        } else {
          // Create default service line
          const serviceLine = await prisma.serviceLine.create({
            data: {
              id: generateId(),
              companyId: company.id,
              name: 'General',
              slug: 'general',
              description: 'Default service line for all work',
              defaultLegalEntityId: defaultLegalEntityId,
              isDefault: true,
              status: 'active',
              updatedAt: new Date(),
            },
          });
          defaultServiceLineId = serviceLine.id;
          console.log(`  ✓ Created default service line: ${serviceLine.name}`);
        }
      } else {
        console.log(`  ✓ Company already has default service line`);
      }

      // Update company with default entity and service line IDs
      await prisma.company.update({
        where: { id: company.id },
        data: {
          defaultLegalEntityId,
          defaultServiceLineId,
          updatedAt: new Date(),
        },
      });
      console.log(`  ✓ Updated company with default entity and service line`);

      // Backfill invoices without legalEntityId
      const invoicesUpdated = await prisma.invoice.updateMany({
        where: {
          companyId: company.id,
          legalEntityId: null,
        },
        data: {
          legalEntityId: defaultLegalEntityId,
        },
      });
      if (invoicesUpdated.count > 0) {
        console.log(`  ✓ Backfilled ${invoicesUpdated.count} invoices with legal entity`);
      }

      // Backfill certificates without legalEntityId
      const certificatesUpdated = await prisma.certificate.updateMany({
        where: {
          companyId: company.id,
          legalEntityId: null,
        },
        data: {
          legalEntityId: defaultLegalEntityId,
        },
      });
      if (certificatesUpdated.count > 0) {
        console.log(`  ✓ Backfilled ${certificatesUpdated.count} certificates with legal entity`);
      }

      // Backfill jobs without serviceLineId
      const jobsUpdated = await prisma.job.updateMany({
        where: {
          companyId: company.id,
          serviceLineId: null,
        },
        data: {
          serviceLineId: defaultServiceLineId,
        },
      });
      if (jobsUpdated.count > 0) {
        console.log(`  ✓ Backfilled ${jobsUpdated.count} jobs with service line`);
      }
    }

    console.log('\n✅ Multi-Entity Billing backfill complete!\n');

    // Summary stats
    const stats = await prisma.$transaction([
      prisma.legalEntity.count(),
      prisma.serviceLine.count(),
      prisma.invoice.count({ where: { legalEntityId: { not: null } } }),
      prisma.certificate.count({ where: { legalEntityId: { not: null } } }),
      prisma.job.count({ where: { serviceLineId: { not: null } } }),
    ]);

    console.log('📊 Summary:');
    console.log(`   Legal Entities: ${stats[0]}`);
    console.log(`   Service Lines: ${stats[1]}`);
    console.log(`   Invoices with Legal Entity: ${stats[2]}`);
    console.log(`   Certificates with Legal Entity: ${stats[3]}`);
    console.log(`   Jobs with Service Line: ${stats[4]}`);

  } catch (error) {
    console.error('\n❌ Error during backfill:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillMultiEntity();
