import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const demoSlug = "demo";

  async function upsertCompanySafe() {
    try {
      return await prisma.company.upsert({
        where: { slug: demoSlug },
        update: {
          brandName: "Quantract Demo",
          brandTagline: "Demo workspace",
          themePrimary: "#2563eb",
          themeAccent: "#7c3aed",
          themeBg: "#ffffff",
          themeText: "#0f172a",
          pdfFooterLine1: "Quantract Demo",
          pdfFooterLine2: "Generated for evaluation",
          updatedAt: new Date(),
        },
        create: {
          id: crypto.randomUUID(),
          slug: demoSlug,
          name: "Quantract Demo",
          brandName: "Quantract Demo",
          brandTagline: "Demo workspace",
          themePrimary: "#2563eb",
          themeAccent: "#7c3aed",
          themeBg: "#ffffff",
          themeText: "#0f172a",
          pdfFooterLine1: "Quantract Demo",
          pdfFooterLine2: "Generated for evaluation",
          updatedAt: new Date(),
        },
      });
    } catch (err: any) {
      if (err?.code === "P2022") {
        return await prisma.company.upsert({
          where: { slug: demoSlug },
          update: { name: "Quantract Demo", updatedAt: new Date() },
          create: { id: crypto.randomUUID(), slug: demoSlug, name: "Quantract Demo", updatedAt: new Date() },
        });
      }
      throw err;
    }
  }

  const demoCompany = await upsertCompanySafe();

  // Hash passwords - support both demo123 (for tests) and Password123! (for production)
  const demoPasswordHash = await bcrypt.hash("demo123", 10);
  const prodPasswordHash = await bcrypt.hash("Password123!", 10);

  // Create demo client + engineer entities
  const client = await prisma.client.upsert({
    where: { id: "demo-client" },
    update: {},
    create: {
      id: "demo-client",
      companyId: demoCompany.id,
      name: "Demo Client",
      email: "client@demo.quantract",
    },
  });

  const engineer = await prisma.engineer.upsert({
    where: { id: "demo-engineer" },
    update: {},
    create: {
      id: "demo-engineer",
      companyId: demoCompany.id,
      name: "Demo Engineer",
      email: "engineer@demo.quantract",
    } as any,
  });

  // Users with Password123! (production users)
  await prisma.user.upsert({
    where: { role_email: { role: "admin", email: "admin@demo.quantract" } },
    update: { companyId: demoCompany.id, passwordHash: prodPasswordHash, name: "Demo Admin" },
    create: {
      role: "admin",
      email: "admin@demo.quantract",
      name: "Demo Admin",
      companyId: demoCompany.id,
      passwordHash: prodPasswordHash,
    },
  });

  await prisma.user.upsert({
    where: { role_email: { role: "engineer", email: "engineer@demo.quantract" } },
    update: { companyId: demoCompany.id, passwordHash: prodPasswordHash, engineerId: engineer.id, name: "Demo Engineer" },
    create: {
      role: "engineer",
      email: "engineer@demo.quantract",
      name: "Demo Engineer",
      companyId: demoCompany.id,
      passwordHash: prodPasswordHash,
      engineerId: engineer.id,
    },
  });

  await prisma.user.upsert({
    where: { role_email: { role: "client", email: "client@demo.quantract" } },
    update: { companyId: demoCompany.id, passwordHash: prodPasswordHash, clientId: client.id, name: "Demo Client" },
    create: {
      role: "client",
      email: "client@demo.quantract",
      name: "Demo Client",
      companyId: demoCompany.id,
      passwordHash: prodPasswordHash,
      clientId: client.id,
    },
  });

  // Users with demo123 (for Playwright tests)
  await prisma.user.upsert({
    where: { role_email: { role: "admin", email: "admin@demo.com" } },
    update: { companyId: demoCompany.id, passwordHash: demoPasswordHash, name: "Admin Demo" },
    create: {
      role: "admin",
      email: "admin@demo.com",
      name: "Admin Demo",
      companyId: demoCompany.id,
      passwordHash: demoPasswordHash,
    },
  });

  await prisma.user.upsert({
    where: { role_email: { role: "engineer", email: "engineer@demo.com" } },
    update: { companyId: demoCompany.id, passwordHash: demoPasswordHash, engineerId: engineer.id, name: "Engineer Demo" },
    create: {
      role: "engineer",
      email: "engineer@demo.com",
      name: "Engineer Demo",
      companyId: demoCompany.id,
      passwordHash: demoPasswordHash,
      engineerId: engineer.id,
    },
  });

  await prisma.user.upsert({
    where: { role_email: { role: "client", email: "client@demo.com" } },
    update: { companyId: demoCompany.id, passwordHash: demoPasswordHash, clientId: client.id, name: "Client Demo" },
    create: {
      role: "client",
      email: "client@demo.com",
      name: "Client Demo",
      companyId: demoCompany.id,
      passwordHash: demoPasswordHash,
      clientId: client.id,
    },
  });

  // Create Pipeline Stages for Enquiries
  const pipelineStages = [
    { name: "New Lead", sortOrder: 0, color: "#3b82f6" },
    { name: "Contacted", sortOrder: 1, color: "#8b5cf6" },
    { name: "Quote Sent", sortOrder: 2, color: "#f59e0b" },
    { name: "Negotiating", sortOrder: 3, color: "#ec4899" },
    { name: "Won", sortOrder: 4, color: "#22c55e", isWon: true },
    { name: "Lost", sortOrder: 5, color: "#ef4444", isLost: true },
  ];

  for (const stage of pipelineStages) {
    await prisma.pipelineStage.upsert({
      where: { 
        id: `${demoCompany.id}-${stage.name.toLowerCase().replace(/\s+/g, '-')}`
      },
      update: stage,
      create: {
        id: `${demoCompany.id}-${stage.name.toLowerCase().replace(/\s+/g, '-')}`,
        companyId: demoCompany.id,
        ...stage,
      },
    });
  }

  // Create demo Supplier
  await prisma.supplier.upsert({
    where: { id: "demo-supplier" },
    update: {},
    create: {
      id: "demo-supplier",
      companyId: demoCompany.id,
      name: "Demo Electrical Supplies",
      email: "orders@demo-supplies.com",
      phone: "01onal555 0123",
      address: "123 Industrial Estate, London, UK",
    },
  });

  // Create demo Subcontractor
  await prisma.subcontractor.upsert({
    where: { id: "demo-subcontractor" },
    update: {},
    create: {
      id: "demo-subcontractor",
      companyId: demoCompany.id,
      name: "Demo Plumbing Services",
      trade: "Plumbing",
      email: "info@demo-plumbing.com",
      phone: "01onal555 0456",
      dayRate: 350,
    },
  });

  // Create demo Stock Items
  const stockItems = [
    { name: "Cable 2.5mm Twin & Earth", sku: "CABLE-25TE", unit: "meter", defaultCost: 85 },
    { name: "Consumer Unit 10-Way", sku: "CU-10WAY", unit: "each", defaultCost: 4500 },
    { name: "LED Downlight 5W", sku: "LED-DL5W", unit: "each", defaultCost: 850 },
    { name: "Double Socket Outlet", sku: "SOCK-DBL", unit: "each", defaultCost: 450 },
  ];

  for (const item of stockItems) {
    await prisma.stockItem.upsert({
      where: { id: `${demoCompany.id}-${item.sku}` },
      update: item,
      create: {
        id: `${demoCompany.id}-${item.sku}`,
        companyId: demoCompany.id,
        ...item,
      },
    });
  }

  // Create demo site for jobs
  const existingSite = await prisma.site.findFirst({
    where: { companyId: demoCompany.id, clientId: client.id }
  });

  let site;
  if (!existingSite) {
    site = await prisma.site.create({
      data: {
        companyId: demoCompany.id,
        clientId: client.id,
        name: "Main Office",
        address1: "123 Business Street",
        city: "London",
        postcode: "SW1A 1AA",
        country: "UK",
      },
    });
  } else {
    site = existingSite;
  }

  // Seed minimal business data (quote -> job -> invoice)
  const existingQuote = await prisma.quote.findUnique({ where: { token: "demo-quote-token" } });

  let quote;
  if (!existingQuote) {
    quote = await prisma.quote.create({
      data: {
        companyId: demoCompany.id,
        token: "demo-quote-token",
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        vatRate: 0.2,
        items: [
          { id: "item-1", description: "Full electrical rewire", qty: 1, unitPrice: 2500 },
          { id: "item-2", description: "Consumer unit upgrade", qty: 1, unitPrice: 450 },
          { id: "item-3", description: "Additional sockets (per socket)", qty: 6, unitPrice: 75 },
        ],
        status: "draft",
      } as any,
    });
  } else {
    quote = existingQuote;
  }

  const existingJob = await prisma.job.findFirst({ where: { quoteId: quote.id } });

  let job;
  if (!existingJob) {
    job = await prisma.job.create({
      data: {
        companyId: demoCompany.id,
        quoteId: quote.id,
        clientId: client.id,
        siteId: site.id,
        engineerId: engineer.id,
        status: "new",
        title: "Demo Electrical Job",
      } as any,
    });
  } else {
    job = existingJob;
  }

  const existingInvoice = await prisma.invoice.findUnique({ where: { token: "demo-invoice-token" } });

  if (!existingInvoice) {
    await prisma.invoice.create({
      data: {
        companyId: demoCompany.id,
        token: "demo-invoice-token",
        clientId: client.id,
        jobId: job.id,
        quoteId: quote.id,
        clientName: client.name,
        clientEmail: client.email,
        subtotal: 3400,
        vat: 680,
        total: 4080,
        status: "draft",
      } as any,
    });
  }

  // Get demo users for assignments
  const adminUser = await prisma.user.findFirst({
    where: { companyId: demoCompany.id, email: "admin@demo.quantract" }
  });

  const engineerUser = await prisma.user.findFirst({
    where: { companyId: demoCompany.id, email: "engineer@demo.quantract" }
  });

  // Seed Enquiries
  const newLeadStage = await prisma.pipelineStage.findFirst({
    where: { companyId: demoCompany.id, name: "New Lead" }
  });

  const contactedStage = await prisma.pipelineStage.findFirst({
    where: { companyId: demoCompany.id, name: "Contacted" }
  });

  const quoteSentStage = await prisma.pipelineStage.findFirst({
    where: { companyId: demoCompany.id, name: "Quote Sent" }
  });

  if (newLeadStage && contactedStage && quoteSentStage) {
    // Enquiry 1: New lead with high value estimate
    await prisma.enquiry.upsert({
      where: { id: "demo-enquiry-1" },
      update: {},
      create: {
        id: "demo-enquiry-1",
        companyId: demoCompany.id,
        stageId: newLeadStage.id,
        ownerId: adminUser?.id,
        name: "Sarah Johnson",
        email: "sarah.johnson@example.com",
        phone: "+44 7700 900123",
        notes: "Interested in full office rewire. Needs quote by end of month. Property is 3000 sq ft office space.",
        valueEstimate: 15000,
        updatedAt: new Date(),
      },
    });

    // Enquiry 2: Contacted lead with medium value
    await prisma.enquiry.upsert({
      where: { id: "demo-enquiry-2" },
      update: {},
      create: {
        id: "demo-enquiry-2",
        companyId: demoCompany.id,
        stageId: contactedStage.id,
        ownerId: engineerUser?.id,
        name: "Tech Startup Ltd",
        email: "facilities@techstartup.com",
        phone: "+44 7700 900456",
        notes: "New office fit-out. Need lighting and power installation for 20 workstations. Follow-up scheduled for next week.",
        valueEstimate: 8500,
        updatedAt: new Date(),
      },
    });

    // Enquiry 3: Quote sent stage with low value
    await prisma.enquiry.upsert({
      where: { id: "demo-enquiry-3" },
      update: {},
      create: {
        id: "demo-enquiry-3",
        companyId: demoCompany.id,
        stageId: quoteSentStage.id,
        ownerId: adminUser?.id,
        name: "John Smith",
        email: "john.smith@residential.com",
        phone: "+44 7700 900789",
        notes: "Residential consumer unit upgrade and outdoor socket installation. Quote sent on 15th Jan, awaiting response.",
        valueEstimate: 1200,
        quoteId: quote.id,
        updatedAt: new Date(),
      },
    });
  }

  // Seed Tasks
  // Task 1: Internal task not linked to job (todo)
  await prisma.task.upsert({
    where: { id: "demo-task-1" },
    update: {},
    create: {
      id: "demo-task-1",
      companyId: demoCompany.id,
      title: "Order electrical supplies for next month",
      description: "Review stock levels and place bulk order with Demo Electrical Supplies. Check for any special offers on cables and consumer units.",
      status: "todo",
      priority: "medium",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      assigneeId: adminUser?.id,
      createdBy: adminUser?.id,
      updatedAt: new Date(),
    },
  });

  // Task 2: Job-linked task (in_progress)
  await prisma.task.upsert({
    where: { id: "demo-task-2" },
    update: {},
    create: {
      id: "demo-task-2",
      companyId: demoCompany.id,
      title: "Complete site survey for Demo Electrical Job",
      description: "Conduct detailed site survey including cable routes, socket positions, and consumer unit location. Take photos and measurements.",
      status: "in_progress",
      priority: "high",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      assigneeId: engineerUser?.id,
      jobId: job.id,
      createdBy: adminUser?.id,
      updatedAt: new Date(),
    },
  });

  // Task 3: Completed task
  await prisma.task.upsert({
    where: { id: "demo-task-3" },
    update: {},
    create: {
      id: "demo-task-3",
      companyId: demoCompany.id,
      title: "Update company safety policies",
      description: "Review and update health & safety documentation to comply with latest regulations. Distribute updated policies to all engineers.",
      status: "completed",
      priority: "medium",
      assigneeId: adminUser?.id,
      createdBy: adminUser?.id,
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      updatedAt: new Date(),
    },
  });

  // Seed Checklist Templates and Job Checklists
  // Template 1: Pre-job safety checklist
  const safetyTemplate = await prisma.checklistTemplate.upsert({
    where: { id: "demo-template-safety" },
    update: {},
    create: {
      id: "demo-template-safety",
      companyId: demoCompany.id,
      title: "Pre-Job Safety Checklist",
      description: "Essential safety checks to complete before starting any electrical work",
      isActive: true,
      version: 1,
      createdBy: adminUser?.id,
      updatedAt: new Date(),
    },
  });

  // Template items for safety checklist
  await prisma.checklistTemplateItem.upsert({
    where: { id: "demo-template-item-1" },
    update: {},
    create: {
      id: "demo-template-item-1",
      templateId: safetyTemplate.id,
      title: "Verify power isolation",
      description: "Confirm main power is isolated and locked out with appropriate signage",
      isRequired: true,
      sortOrder: 0,
    },
  });

  await prisma.checklistTemplateItem.upsert({
    where: { id: "demo-template-item-2" },
    update: {},
    create: {
      id: "demo-template-item-2",
      templateId: safetyTemplate.id,
      title: "Check test equipment calibration",
      description: "Ensure all testing equipment is within calibration date",
      isRequired: true,
      sortOrder: 1,
    },
  });

  await prisma.checklistTemplateItem.upsert({
    where: { id: "demo-template-item-3" },
    update: {},
    create: {
      id: "demo-template-item-3",
      templateId: safetyTemplate.id,
      title: "PPE inspection",
      description: "Inspect all personal protective equipment for damage",
      isRequired: true,
      sortOrder: 2,
    },
  });

  await prisma.checklistTemplateItem.upsert({
    where: { id: "demo-template-item-4" },
    update: {},
    create: {
      id: "demo-template-item-4",
      templateId: safetyTemplate.id,
      title: "Risk assessment review",
      description: "Review site-specific risk assessment with team",
      isRequired: true,
      sortOrder: 3,
    },
  });

  // Attach safety checklist to demo job
  const jobChecklist = await prisma.jobChecklist.upsert({
    where: { id: "demo-job-checklist-1" },
    update: {},
    create: {
      id: "demo-job-checklist-1",
      companyId: demoCompany.id,
      jobId: job.id,
      templateId: safetyTemplate.id,
      title: "Pre-Job Safety Checklist",
      description: "Essential safety checks to complete before starting any electrical work",
      createdBy: adminUser?.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // Create checklist items (some completed, some pending)
  await prisma.jobChecklistItem.upsert({
    where: { id: "demo-checklist-item-1" },
    update: {},
    create: {
      id: "demo-checklist-item-1",
      checklistId: jobChecklist.id,
      title: "Verify power isolation",
      description: "Confirm main power is isolated and locked out with appropriate signage",
      isRequired: true,
      sortOrder: 0,
      status: "completed",
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      completedBy: engineerUser?.id,
      completedByName: engineerUser?.name,
      notes: "Power isolated at main consumer unit. Warning signs placed.",
    },
  });

  await prisma.jobChecklistItem.upsert({
    where: { id: "demo-checklist-item-2" },
    update: {},
    create: {
      id: "demo-checklist-item-2",
      checklistId: jobChecklist.id,
      title: "Check test equipment calibration",
      description: "Ensure all testing equipment is within calibration date",
      isRequired: true,
      sortOrder: 1,
      status: "completed",
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      completedBy: engineerUser?.id,
      completedByName: engineerUser?.name,
      notes: "All equipment calibrated. Next calibration due in 6 months.",
    },
  });

  await prisma.jobChecklistItem.upsert({
    where: { id: "demo-checklist-item-3" },
    update: {},
    create: {
      id: "demo-checklist-item-3",
      checklistId: jobChecklist.id,
      title: "PPE inspection",
      description: "Inspect all personal protective equipment for damage",
      isRequired: true,
      sortOrder: 2,
      status: "pending",
    },
  });

  await prisma.jobChecklistItem.upsert({
    where: { id: "demo-checklist-item-4" },
    update: {},
    create: {
      id: "demo-checklist-item-4",
      checklistId: jobChecklist.id,
      title: "Risk assessment review",
      description: "Review site-specific risk assessment with team",
      isRequired: true,
      sortOrder: 3,
      status: "pending",
    },
  });

  // Template 2: Post-job completion checklist
  const completionTemplate = await prisma.checklistTemplate.upsert({
    where: { id: "demo-template-completion" },
    update: {},
    create: {
      id: "demo-template-completion",
      companyId: demoCompany.id,
      title: "Job Completion Checklist",
      description: "Final checks before closing out a job",
      isActive: true,
      version: 1,
      createdBy: adminUser?.id,
      updatedAt: new Date(),
    },
  });

  // Template items for completion checklist
  await prisma.checklistTemplateItem.upsert({
    where: { id: "demo-template-item-5" },
    update: {},
    create: {
      id: "demo-template-item-5",
      templateId: completionTemplate.id,
      title: "All electrical tests completed",
      description: "Confirm all required electrical testing is complete and passed",
      isRequired: true,
      sortOrder: 0,
    },
  });

  await prisma.checklistTemplateItem.upsert({
    where: { id: "demo-template-item-6" },
    update: {},
    create: {
      id: "demo-template-item-6",
      templateId: completionTemplate.id,
      title: "Certificates issued",
      description: "All necessary electrical certificates have been issued to client",
      isRequired: true,
      sortOrder: 1,
    },
  });

  await prisma.checklistTemplateItem.upsert({
    where: { id: "demo-template-item-7" },
    update: {},
    create: {
      id: "demo-template-item-7",
      templateId: completionTemplate.id,
      title: "Site cleaned and materials removed",
      description: "Work area cleaned and all waste materials removed from site",
      isRequired: false,
      sortOrder: 2,
    },
  });

  // Create Deal Stages for CRM Pipeline
  const dealStages = [
    { name: "Lead", sortOrder: 0, probability: 10, color: "#94a3b8" },
    { name: "Qualified", sortOrder: 1, probability: 25, color: "#3b82f6" },
    { name: "Proposal", sortOrder: 2, probability: 50, color: "#8b5cf6" },
    { name: "Negotiation", sortOrder: 3, probability: 75, color: "#f59e0b" },
    { name: "Won", sortOrder: 4, probability: 100, color: "#22c55e", isWon: true },
    { name: "Lost", sortOrder: 5, probability: 0, color: "#ef4444", isLost: true },
  ];

  for (const stage of dealStages) {
    await prisma.dealStage.upsert({
      where: {
        companyId_name: { companyId: demoCompany.id, name: stage.name }
      },
      update: stage,
      create: {
        id: `${demoCompany.id}-deal-${stage.name.toLowerCase()}`,
        companyId: demoCompany.id,
        ...stage,
      },
    });
  }

  console.log("✅ Seed complete");
  console.log("");
  console.log("Demo accounts:");
  console.log("──────────────────────────────────────────");
  console.log("Production (Password123!):");
  console.log("  Admin:    admin@demo.quantract");
  console.log("  Engineer: engineer@demo.quantract");
  console.log("  Client:   client@demo.quantract");
  console.log("");
  console.log("Testing (demo123):");
  console.log("  Admin:    admin@demo.com");
  console.log("  Engineer: engineer@demo.com");
  console.log("  Client:   client@demo.com");
  console.log("──────────────────────────────────────────");
  console.log("");
  console.log("Demo data created:");
  console.log("  ✓ 6 Pipeline stages for enquiries");
  console.log("  ✓ 6 Deal stages for CRM pipeline");
  console.log("  ✓ 1 Demo supplier");
  console.log("  ✓ 1 Demo subcontractor");
  console.log("  ✓ 4 Stock items");
  console.log("  ✓ 1 Demo quote with line items");
  console.log("  ✓ 1 Demo job");
  console.log("  ✓ 1 Demo invoice");
  console.log("  ✓ 3 Sample enquiries (New Lead, Contacted, Quote Sent)");
  console.log("  ✓ 3 Sample tasks (todo, in_progress, completed)");
  console.log("  ✓ 2 Checklist templates (Safety & Completion)");
  console.log("  ✓ 1 Job checklist with 4 items (2 completed, 2 pending)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
