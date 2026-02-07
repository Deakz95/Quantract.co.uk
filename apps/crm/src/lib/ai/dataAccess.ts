import { getPrisma } from "@/lib/server/prisma";
import type { AISessionData } from "@/lib/auth/aiSession";
import { getAccessibleJobIds, getClientId, getEngineerId, hasPermission } from "@/lib/ai/permissions";
import type { AIPermissionContext } from "@/lib/ai/aiPermissionContext";

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
        jobStages: {
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
      for (const s of (j as any).jobStages || []) bundle.validEntityIds.add(s.id);
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

// ── V2: Permission-context-aware data fetching ───────────────────────

/**
 * Build the AI data bundle using `AIPermissionContext` for authorization.
 *
 * Key differences from `buildAiContext()`:
 * - Uses `permCtx.dataScope.isCompanyWide` instead of per-role `if` branches
 * - Financial field gating via `permCtx.canSeeFinancials` (permission-based, NOT mode-based)
 * - External accountant (client+accounts.access) gets invoices only, no job details
 * - Office role gets company-wide scope (fixes gap where getAccessibleJobIds() returns [])
 */
export async function buildAiContextV2(permCtx: AIPermissionContext): Promise<AiDataBundle> {
  const client = getPrisma();
  if (!client) throw new Error("PRISMA_NOT_CONFIGURED");

  const { companyId, effectiveRole, dataScope, canSeeFinancials } = permCtx;

  const bundle: AiDataBundle = {
    role: effectiveRole,
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

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // ── External accountant: invoices only, early return ──────────────
  if (effectiveRole === "client" && permCtx.hasAccountsAccess) {
    bundle.invoices = await client.invoice.findMany({
      where: { companyId },
      orderBy: { updatedAt: "desc" },
      take: MAX_INVOICES_ADMIN,
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
        subtotal: true,
        vat: true,
        total: true,
        jobId: true, // bare FK only — no job join
      },
    });
    for (const i of bundle.invoices) bundle.validEntityIds.add(i.id);
    return bundle;
  }

  // ── JOBS ──────────────────────────────────────────────────────────
  if (hasPermission(effectiveRole, "job", "read")) {
    const jobWhere = dataScope.isCompanyWide
      ? { companyId }
      : { companyId, id: { in: dataScope.jobIds ?? [] } };

    const jobLimit = dataScope.isCompanyWide
      ? MAX_JOBS_ADMIN
      : Math.min(20, (dataScope.jobIds?.length ?? 0) || 20);

    bundle.jobs = await client.job.findMany({
      where: jobWhere,
      orderBy: { updatedAt: "desc" },
      take: jobLimit,
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
        jobStages: {
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
      for (const s of (j as any).jobStages || []) bundle.validEntityIds.add(s.id);
    }
  }

  // ── QUOTES ────────────────────────────────────────────────────────
  if (hasPermission(effectiveRole, "quote", "read")) {
    const quoteWhere = dataScope.isCompanyWide
      ? { companyId, updatedAt: { gte: ninetyDaysAgo } }
      : effectiveRole === "client" && dataScope.clientId
        ? { companyId, clientId: dataScope.clientId, updatedAt: { gte: ninetyDaysAgo } }
        : { companyId, id: "__none__" };

    bundle.quotes = await client.quote.findMany({
      where: quoteWhere,
      orderBy: { updatedAt: "desc" },
      take: dataScope.isCompanyWide ? MAX_QUOTES_ADMIN : 20,
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

  // ── INVOICES ──────────────────────────────────────────────────────
  if (hasPermission(effectiveRole, "invoice", "read")) {
    const invoiceWhere = dataScope.isCompanyWide
      ? { companyId, updatedAt: { gte: ninetyDaysAgo } }
      : effectiveRole === "client" && dataScope.clientId
        ? { companyId, clientId: dataScope.clientId, updatedAt: { gte: ninetyDaysAgo } }
        : { companyId, id: "__none__" };

    // Financial fields gated by permission, not mode
    const financialSelect = canSeeFinancials
      ? { subtotal: true as const, vat: true as const, total: true as const }
      : {};

    bundle.invoices = await client.invoice.findMany({
      where: invoiceWhere,
      orderBy: { updatedAt: "desc" },
      take: dataScope.isCompanyWide ? MAX_INVOICES_ADMIN : 20,
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
        paymentUrl: true,
        ...financialSelect,
      },
    });

    for (const i of bundle.invoices) {
      bundle.validEntityIds.add(i.id);
      if (i.job?.id) bundle.validEntityIds.add(i.job.id);
    }
  }

  // ── VARIATIONS ────────────────────────────────────────────────────
  if (hasPermission(effectiveRole, "variation", "read")) {
    const variationWhere = dataScope.isCompanyWide
      ? { companyId, updatedAt: { gte: ninetyDaysAgo } }
      : { companyId, jobId: { in: dataScope.jobIds ?? [] } };

    // Financial fields on variations also gated by canSeeFinancials
    const variationFinancialSelect = canSeeFinancials
      ? { subtotal: true as const, vat: true as const, total: true as const }
      : {};

    bundle.variations = await client.variation.findMany({
      where: variationWhere,
      orderBy: { updatedAt: "desc" },
      take: dataScope.isCompanyWide ? MAX_VARIATIONS_ADMIN : 30,
      select: {
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
        ...variationFinancialSelect,
      },
    });

    for (const v of bundle.variations) bundle.validEntityIds.add(v.id);
  }

  // ── TIME ENTRIES ──────────────────────────────────────────────────
  if (hasPermission(effectiveRole, "timeEntry", "read")) {
    const timeWhere = dataScope.isCompanyWide
      ? { companyId, startedAt: { gte: ninetyDaysAgo } }
      : effectiveRole === "engineer" && dataScope.engineerId
        ? { companyId, engineerId: dataScope.engineerId, startedAt: { gte: ninetyDaysAgo } }
        : { companyId, id: "__none__" };

    bundle.timeEntries = await client.timeEntry.findMany({
      where: timeWhere,
      orderBy: { startedAt: "desc" },
      take: dataScope.isCompanyWide ? 50 : MAX_TIME_ENTRIES_ENGINEER,
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

  // ── TIMESHEETS ────────────────────────────────────────────────────
  if (hasPermission(effectiveRole, "timesheet", "read")) {
    const tsWhere = dataScope.isCompanyWide
      ? { companyId, updatedAt: { gte: ninetyDaysAgo } }
      : effectiveRole === "engineer" && dataScope.engineerId
        ? { companyId, engineerId: dataScope.engineerId, updatedAt: { gte: ninetyDaysAgo } }
        : { companyId, id: "__none__" };

    bundle.timesheets = await client.timesheet.findMany({
      where: tsWhere,
      orderBy: { updatedAt: "desc" },
      take: dataScope.isCompanyWide ? 30 : 15,
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

  // ── CERTIFICATES ──────────────────────────────────────────────────
  if (hasPermission(effectiveRole, "certificate", "read")) {
    const certWhere = dataScope.isCompanyWide
      ? { companyId, updatedAt: { gte: ninetyDaysAgo } }
      : { companyId, jobId: { in: dataScope.jobIds ?? [] } };

    bundle.certs = await client.certificate.findMany({
      where: certWhere,
      orderBy: { updatedAt: "desc" },
      take: dataScope.isCompanyWide ? MAX_CERTS_ADMIN : 30,
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

  // ── AUDITS (admin only) ───────────────────────────────────────────
  if (hasPermission(effectiveRole, "audit", "read")) {
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
