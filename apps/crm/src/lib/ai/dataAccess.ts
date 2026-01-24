import { getPrisma } from "@/lib/server/prisma";
import type { AISessionData } from "@/lib/auth/aiSession";
import { getAccessibleJobIds, getClientId, getEngineerId, hasPermission } from "@/lib/ai/permissions";

export interface AiDataBundle {
  role: AISessionData["role"];
  companyId: string;
  jobs: any[];
  quotes: any[];
  variations: any[];
  invoices: any[];
  timeEntries: any[];
  timesheets: any[];
  certs: any[];
  audits: any[];
  validEntityIds: Set<string>;
}

const MAX_JOBS_ADMIN = 50;
const MAX_INVOICES_ADMIN = 50;
const MAX_QUOTES_ADMIN = 30;
const MAX_VARIATIONS_ADMIN = 30;
const MAX_CERTS_ADMIN = 30;
const MAX_TIME_ENTRIES_ENGINEER = 40;
const MAX_AUDITS_ADMIN = 30;

export async function buildAiContext(session: AISessionData): Promise<AiDataBundle> {
  const client = getPrisma();
  if (!client) throw new Error("PRISMA_NOT_CONFIGURED");
  if (!session.companyId) throw new Error("NO_COMPANY_ID");

  const { role, companyId } = session;
  const accessibleJobIds = await getAccessibleJobIds(session);
  const clientId = await getClientId(session);
  const engineerId = await getEngineerId(session);

  const bundle: AiDataBundle = {
    role,
    companyId,
    jobs: [],
    quotes: [],
    variations: [],
    invoices: [],
    timeEntries: [],
    timesheets: [],
    certs: [],
    audits: [],
    validEntityIds: new Set<string>(),
  };

  // Prefer recent data to keep token usage down.
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // JOBS
  if (hasPermission(role, "job", "read")) {
    const where = role === "admin" ? { companyId } : { companyId, id: { in: accessibleJobIds } };

    bundle.jobs = await client.job.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: role === "admin" ? MAX_JOBS_ADMIN : Math.min(20, accessibleJobIds.length || 20),
      select: {
        id: true,
        title: true,
        status: true,
        scheduledAt: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        client: { select: { id: true, name: true, email: true } },
        site: { select: { id: true, name: true, address1: true, city: true, postcode: true } },
        engineer: { select: { id: true, name: true, email: true } },
        stages: {
          orderBy: { sortOrder: "asc" },
          select: { id: true, name: true, status: true, sortOrder: true, completedAt: true },
        },
      },
    });

    for (const j of bundle.jobs) {
      bundle.validEntityIds.add(j.id);
      if (j.client?.id) bundle.validEntityIds.add(j.client.id);
      if (j.site?.id) bundle.validEntityIds.add(j.site.id);
      if (j.engineer?.id) bundle.validEntityIds.add(j.engineer.id);
      for (const s of j.stages || []) bundle.validEntityIds.add(s.id);
    }
  }

  // QUOTES (admin + client)
  if (hasPermission(role, "quote", "read")) {
    const quoteWhere =
      role === "admin"
        ? { companyId, updatedAt: { gte: ninetyDaysAgo } }
        : role === "client" && clientId
          ? { companyId, clientId, updatedAt: { gte: ninetyDaysAgo } }
          : { companyId, id: "__none__" };

    bundle.quotes = await client.quote.findMany({
      where: quoteWhere,
      orderBy: { updatedAt: "desc" },
      take: role === "admin" ? MAX_QUOTES_ADMIN : 20,
      select: {
        id: true,
        status: true,
        clientName: true,
        clientEmail: true,
        createdAt: true,
        updatedAt: true,
        items: true,
        vatRate: true,
      },
    });

    for (const q of bundle.quotes) bundle.validEntityIds.add(q.id);
  }

  // INVOICES (admin + client)
  if (hasPermission(role, "invoice", "read")) {
    const invoiceWhere =
      role === "admin"
        ? { companyId, updatedAt: { gte: ninetyDaysAgo } }
        : role === "client" && clientId
          ? { companyId, clientId, updatedAt: { gte: ninetyDaysAgo } }
          : { companyId, id: "__none__" };

    bundle.invoices = await client.invoice.findMany({
      where: invoiceWhere,
      orderBy: { updatedAt: "desc" },
      take: role === "admin" ? MAX_INVOICES_ADMIN : 20,
      select: {
        id: true,
        invoiceNumber: true,
        type: true,
        stageName: true,
        status: true,
        createdAt: true,
        sentAt: true,
        paidAt: true,
        clientName: true,
        clientEmail: true,
        job: { select: { id: true, title: true, status: true } },
        subtotal: true,
        vat: true,
        total: true,
        paymentUrl: true,
      },
    });

    for (const i of bundle.invoices) {
      bundle.validEntityIds.add(i.id);
      if (i.job?.id) bundle.validEntityIds.add(i.job.id);
    }
  }

  // VARIATIONS
  if (hasPermission(role, "variation", "read")) {
    const variationWhere = role === "admin" ? { companyId, updatedAt: { gte: ninetyDaysAgo } } : { companyId, jobId: { in: accessibleJobIds } };

    bundle.variations = await client.variation.findMany({
      where: variationWhere,
      orderBy: { updatedAt: "desc" },
      take: role === "admin" ? MAX_VARIATIONS_ADMIN : 30,
      select:
        role === "engineer"
          ? {
              id: true,
              jobId: true,
              stageId: true,
              title: true,
              reason: true,
              notes: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              sentAt: true,
              approvedAt: true,
              rejectedAt: true,
              approvedBy: true,
            }
          : {
              id: true,
              jobId: true,
              stageId: true,
              title: true,
              reason: true,
              notes: true,
              status: true,
              createdAt: true,
              updatedAt: true,
              sentAt: true,
              approvedAt: true,
              rejectedAt: true,
              approvedBy: true,
              subtotal: true,
              vat: true,
              total: true,
            },
    });

    for (const v of bundle.variations) bundle.validEntityIds.add(v.id);
  }

  // TIME ENTRIES + TIMESHEETS (engineer/admin)
  if (hasPermission(role, "timeEntry", "read")) {
    const timeWhere =
      role === "admin"
        ? { companyId, startedAt: { gte: ninetyDaysAgo } }
        : role === "engineer" && engineerId
          ? { companyId, engineerId, startedAt: { gte: ninetyDaysAgo } }
          : { companyId, id: "__none__" };

    bundle.timeEntries = await client.timeEntry.findMany({
      where: timeWhere,
      orderBy: { startedAt: "desc" },
      take: role === "admin" ? 50 : MAX_TIME_ENTRIES_ENGINEER,
      select: {
        id: true,
        jobId: true,
        engineerId: true,
        startedAt: true,
        endedAt: true,
        breakMinutes: true,
        notes: true,
        status: true,
        timesheetId: true,
        job: { select: { id: true, title: true, status: true } },
      },
    });

    for (const t of bundle.timeEntries) {
      bundle.validEntityIds.add(t.id);
      if (t.job?.id) bundle.validEntityIds.add(t.job.id);
    }
  }

  if (hasPermission(role, "timesheet", "read")) {
    const tsWhere =
      role === "admin"
        ? { companyId, updatedAt: { gte: ninetyDaysAgo } }
        : role === "engineer" && engineerId
          ? { companyId, engineerId, updatedAt: { gte: ninetyDaysAgo } }
          : { companyId, id: "__none__" };

    bundle.timesheets = await client.timesheet.findMany({
      where: tsWhere,
      orderBy: { updatedAt: "desc" },
      take: role === "admin" ? 30 : 15,
      select: {
        id: true,
        engineerId: true,
        weekStart: true,
        status: true,
        submittedAt: true,
        approvedAt: true,
        approvedBy: true,
      },
    });

    for (const t of bundle.timesheets) bundle.validEntityIds.add(t.id);
  }

  // CERTIFICATES
  if (hasPermission(role, "certificate", "read")) {
    const certWhere = role === "admin" ? { companyId, updatedAt: { gte: ninetyDaysAgo } } : { companyId, jobId: { in: accessibleJobIds } };

    bundle.certs = await client.certificate.findMany({
      where: certWhere,
      orderBy: { updatedAt: "desc" },
      take: role === "admin" ? MAX_CERTS_ADMIN : 30,
      select: {
        id: true,
        jobId: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        completedAt: true,
        job: { select: { id: true, title: true, status: true } },
      },
    });

    for (const c of bundle.certs) {
      bundle.validEntityIds.add(c.id);
      if (c.job?.id) bundle.validEntityIds.add(c.job.id);
    }
  }

  // AUDITS (admin only)
  if (hasPermission(role, "audit", "read")) {
    bundle.audits = await client.auditEvent.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: MAX_AUDITS_ADMIN,
      select: { id: true, entityType: true, entityId: true, action: true, actorRole: true, actor: true, createdAt: true },
    });
    for (const a of bundle.audits) bundle.validEntityIds.add(a.id);
  }

  return bundle;
}
