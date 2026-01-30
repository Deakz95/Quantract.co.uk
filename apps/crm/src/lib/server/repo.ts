import crypto from "node:crypto";
import type {
  Agreement,
  AuditEvent,
  Quote,
  QuoteItem,
  Invoice,
  Client,
  Site,
  Engineer,
  Job,
  ScheduleEntry,
  JobStage,
  JobCostingSummary,
  JobBudgetLine,
  RateCard,
  Variation,
  SnagItem,
  QuoteRevision,
  InvoiceAttachment,
  InvoicePayment,
  SupplierBill,
  SupplierBillLine,
  TimeEntry,
  Timesheet,
  CostItem,
  CostItemAttachment,
  Certificate,
  CertificateTestResult,
  CertificateType,
  VariationAttachment,
} from "@/lib/server/db";
import * as fileDb from "@/lib/server/db";
import type { Role } from "@/lib/serverAuth";
import { getCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { renderCertificatePdf, renderQuotePdf, renderAuditAgreementPdf, renderClientAgreementPdf, renderInvoicePdf, renderVariationPdf, type BrandContext } from "@/lib/server/pdf";
import { writeUploadBytes, readUploadBytes } from "@/lib/server/storage";
import { sendInvoiceReminder, absoluteUrl } from "@/lib/server/email";
import { certificateIsReadyForCompletion, getCertificateTemplate, normalizeCertificateData } from "@/lib/certificates";
import { validateCertificateForCompletion, isCertificateReadyForCompletion } from "@/lib/certificateValidation";
import { clampMoney, calculateVATFromSubtotal, validateVATCalculation } from "@/lib/invoiceMath";
import { calculateJobFinancials, calculateCostItemTotal } from "@/lib/server/jobFinancials";
import { resolveLegalEntity, allocateInvoiceNumberForEntity, allocateCertificateNumberForEntity } from "@/lib/server/multiEntity";
import type { PrismaClient } from "@prisma/client";

type Tx = PrismaClient;


async function getBrandContextForCompanyId(companyId: string): Promise<BrandContext> {
  const client = p();
  if (!client) {
    return { name: process.env.QT_BRAND_NAME || "Quantract", tagline: process.env.QT_BRAND_TAGLINE || null, logoPngBytes: null };
  }
  const company = await client.company
    .findUnique({ where: { id: companyId }, select: { brandName: true, brandTagline: true, logoKey: true } })
    .catch(() => null);
  const logoKey = company?.logoKey || null;
  let logoPngBytes: Uint8Array | null = null;
  if (logoKey) {
    const buf = readUploadBytes(logoKey);
    if (buf) logoPngBytes = new Uint8Array(buf);
  }
  return { name: company?.brandName || "Quantract", tagline: company?.brandTagline || null, logoPngBytes };
}

export async function getBrandContextForCurrentCompany(): Promise<BrandContext> {
  const client = p();
  if (!client) {
    return { name: process.env.QT_BRAND_NAME || "Quantract", tagline: process.env.QT_BRAND_TAGLINE || null, logoPngBytes: null };
  }
  const companyId = await requireCompanyIdForPrisma();
  return getBrandContextForCompanyId(companyId);
}

export async function getBrandContextForQuoteToken(token: string): Promise<BrandContext> {
  const client = p();
  if (!client) return { name: process.env.QT_BRAND_NAME || "Quantract", tagline: process.env.QT_BRAND_TAGLINE || null, logoPngBytes: null };
  const row = await client.quote.findUnique({ where: { token }, select: { companyId: true } }).catch(() => null);
  if (!row?.companyId) return { name: process.env.QT_BRAND_NAME || "Quantract", tagline: process.env.QT_BRAND_TAGLINE || null, logoPngBytes: null };
  return getBrandContextForCompanyId(row.companyId);
}

export async function getBrandContextForInvoiceToken(token: string): Promise<BrandContext> {
  const client = p();
  if (!client) return { name: process.env.QT_BRAND_NAME || "Quantract", tagline: process.env.QT_BRAND_TAGLINE || null, logoPngBytes: null };
  const row = await client.invoice.findUnique({ where: { token }, select: { companyId: true } }).catch(() => null);
  if (!row?.companyId) return { name: process.env.QT_BRAND_NAME || "Quantract", tagline: process.env.QT_BRAND_TAGLINE || null, logoPngBytes: null };
  return getBrandContextForCompanyId(row.companyId);
}

export async function getBrandContextForAgreementToken(token: string): Promise<BrandContext> {
  const client = p();
  if (!client) return { name: process.env.QT_BRAND_NAME || "Quantract", tagline: process.env.QT_BRAND_TAGLINE || null, logoPngBytes: null };
  const row = await client.agreement.findUnique({ where: { token }, select: { companyId: true } as any }).catch(() => null);
  const companyId = (row as any)?.companyId;
  if (!companyId) return { name: process.env.QT_BRAND_NAME || "Quantract", tagline: process.env.QT_BRAND_TAGLINE || null, logoPngBytes: null };
  return getBrandContextForCompanyId(companyId);
}

export async function getBrandContextForVariationToken(token: string): Promise<BrandContext> {
  const client = p();
  if (!client) return { name: process.env.QT_BRAND_NAME || "Quantract", tagline: process.env.QT_BRAND_TAGLINE || null, logoPngBytes: null };
  const row = await client.variation.findUnique({ where: { token }, select: { companyId: true } as any }).catch(() => null);
  const companyId = (row as any)?.companyId;
  if (!companyId) return { name: process.env.QT_BRAND_NAME || "Quantract", tagline: process.env.QT_BRAND_TAGLINE || null, logoPngBytes: null };
  return getBrandContextForCompanyId(companyId);
}




export async function setCompanyXeroConnection(input: {
  xeroConnected: boolean;
  xeroTenantId?: string | null;
  xeroAccessToken?: string | null;
  xeroRefreshToken?: string | null;
  xeroTokenExpiresAtISO?: string | null;
}) {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const row = await client.company.update({
    where: { id: companyId },
    data: {
      xeroConnected: Boolean(input.xeroConnected),
      xeroTenantId: input.xeroTenantId ?? null,
      xeroAccessToken: input.xeroAccessToken ?? null,
      xeroRefreshToken: input.xeroRefreshToken ?? null,
      xeroTokenExpiresAt: input.xeroTokenExpiresAtISO ? new Date(input.xeroTokenExpiresAtISO) : null,
    },
  }).catch(() => null);
  return row ? { ok: true } : null;
}

export async function getCompanyXeroConnection() {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const row = await client.company.findUnique({ where: { id: companyId }, select: { xeroConnected: true, xeroTenantId: true, xeroTokenExpiresAt: true } }).catch(() => null);
  if (!row) return null;
  return {
    xeroConnected: Boolean(row.xeroConnected),
    xeroTenantId: row.xeroTenantId ?? undefined,
    xeroTokenExpiresAtISO: row.xeroTokenExpiresAt ? new Date(row.xeroTokenExpiresAt).toISOString() : undefined,
  };
}
function p() {
  const client = getPrisma();
  if (!client) return null;
  if (process.env.QT_USE_PRISMA !== "1") return null;
  return client;
}


async function requireCompanyIdForPrisma(): Promise<string> {
  const companyId = await getCompanyId();
  if (!companyId) {
    const err: any = new Error("Missing company context");
    err.status = 401;
    throw err;
  }
  return companyId;
}

async function allocateInvoiceNumber(client: any): Promise<string | null> {
  try {
    const companyId = await requireCompanyIdForPrisma();
    const res = await client.$transaction(async (tx: any) => {
      const c = await tx.company.findUnique({ where: { id: companyId }, select: { invoiceNumberPrefix: true, nextInvoiceNumber: true } });
      if (!c) return null;
      const n = Number(c.nextInvoiceNumber || 1);
      await tx.company.update({ where: { id: companyId }, data: { nextInvoiceNumber: n + 1 } });
      const prefix = String(c.invoiceNumberPrefix || "INV-");
      const padded = String(n).padStart(5, "0");
      return `${prefix}${padded}`;
    });
    return res;
  } catch {
    return null;
  }
}


export async function listClients(): Promise<Client[]> {
  const client = p();
  if (!client) return fileDb.listClients();
  const rows = await client.client.findMany({ where: { companyId: await requireCompanyIdForPrisma() }, orderBy: { createdAt: "desc" } });
  return rows.map(toClient);
}

export async function getClientById(id: string): Promise<Client | null> {
  const client = p();
  if (!client) return fileDb.getClientById(id);
  const row = await client.client.findFirst({ where: { id, companyId: await requireCompanyIdForPrisma() } });
  return row ? toClient(row) : null;
}

export async function createClient(input: Omit<Client, "id" | "createdAtISO" | "updatedAtISO">): Promise<Client> {
  const client = p();
  if (!client) return fileDb.createClient(input);
  const row = await client.client.create({
    data: { companyId: await requireCompanyIdForPrisma(),
      name: String(input.name ?? "").trim(),
      email: String(input.email ?? "").trim().toLowerCase(),
      phone: input.phone ?? null,
      address1: input.address1 ?? null,
      address2: input.address2 ?? null,
      city: input.city ?? null,
      county: input.county ?? null,
      postcode: input.postcode ?? null,
      country: input.country ?? null,
      notes: input.notes ?? null,
      paymentTermsDays: (input as any).paymentTermsDays != null ? Number((input as any).paymentTermsDays) : null,
      disableAutoChase: (input as any).disableAutoChase != null ? Boolean((input as any).disableAutoChase) : false,
      xeroContactId: (input as any).xeroContactId ?? null,
    },
  });
  return toClient(row);
}

export async function updateClient(id: string, patch: Partial<Omit<Client, "id" | "createdAtISO" | "updatedAtISO">>): Promise<Client | null> {
  const client = p();
  if (!client) return fileDb.updateClient(id, patch);
  const row = await client.client
    .update({
      where: { id },
      data: {
        name: patch.name ?? undefined,
        email: patch.email ? String(patch.email).trim().toLowerCase() : undefined,
        phone: patch.phone ?? undefined,
        address1: patch.address1 ?? undefined,
        address2: patch.address2 ?? undefined,
        city: patch.city ?? undefined,
        county: patch.county ?? undefined,
        postcode: patch.postcode ?? undefined,
        country: patch.country ?? undefined,
        notes: patch.notes ?? undefined,
        paymentTermsDays: (patch as any).paymentTermsDays === null ? null : (patch as any).paymentTermsDays != null ? Number((patch as any).paymentTermsDays) : undefined,
        disableAutoChase: (patch as any).disableAutoChase != null ? Boolean((patch as any).disableAutoChase) : undefined,
        xeroContactId: (patch as any).xeroContactId ?? undefined,
      },
    })
    .catch(() => null);
  return row ? toClient(row) : null;
}

export async function deleteClient(id: string): Promise<boolean> {
  const client = p();
  if (!client) return fileDb.deleteClient(id);
  const res = await client.client.delete({ where: { id } }).catch(() => null);
  return !!res;
}

export async function getClientOverview(id: string): Promise<{ client: Client; quotes: Quote[]; agreements: Agreement[]; invoices: Invoice[] } | null> {
  const c = await getClientById(id);
  if (!c) return null;
  const client = p();
  if (!client) {
    const quotes = fileDb.listQuotesForClient({ clientId: id, email: c.email });
    const agreements = fileDb.listAgreementsForQuoteIds(quotes.map((q) => q.id));
    const invoices = fileDb.listInvoicesForClient({ clientId: id, email: c.email });
    return { client: c, quotes, agreements, invoices };
  }
  const quotesRows = await client.quote.findMany({ where: { OR: [{ clientId: id }, { clientEmail: c.email }] }, orderBy: { createdAt: "desc" } });
  const quotes = quotesRows.map(toQuote);
  const quoteIds = quotesRows.map((q: any) => q.id);
  const agreementsRows = await client.agreement.findMany({ where: { quoteId: { in: quoteIds } } });
  const agreements = agreementsRows.map(toAgreement);
  const invoicesRows = await client.invoice.findMany({ where: { OR: [{ clientId: id }, { clientEmail: c.email }] }, orderBy: { createdAt: "desc" } });
  const invoices = invoicesRows.map(toInvoice);
  return { client: c, quotes, agreements, invoices };
}

// ------------------ Sites ------------------

export async function listSitesForClient(clientId: string): Promise<Site[]> {
  const client = p();
  if (!client) return [];
  const rows = await client.site.findMany({ where: { clientId }, orderBy: { createdAt: "desc" } });
  return rows.map(toSite);
}

export async function getSiteById(id: string): Promise<Site | null> {
  const client = p();
  if (!client) return null;
  const row = await client.site.findUnique({ where: { id } }).catch(() => null);
  return row ? toSite(row) : null;
}

export async function createSite(input: {
  clientId: string;
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  notes?: string;
}): Promise<Site | null> {
  const client = p();
  if (!client) return null;
  const row = await client.site
    .create({
      data: {
        clientId: input.clientId,
        name: input.name ?? null,
        address1: input.address1 ?? null,
        address2: input.address2 ?? null,
        city: input.city ?? null,
        county: input.county ?? null,
        postcode: input.postcode ?? null,
        country: input.country ?? null,
        notes: input.notes ?? null,
      } as any,
    })
    .catch(() => null);
  return row ? toSite(row) : null;
}

async function ensureSiteFromFreeformAddress(clientId: string, siteAddress?: string | null): Promise<string | null> {
  const client = p();
  if (!client) return null;
  const addr = String(siteAddress ?? "").trim();
  if (!addr) return null;
  // Very pragmatic MVP: store the full string in address1.
  const row = await client.site.create({ data: { companyId: await requireCompanyIdForPrisma(), clientId, address1: addr } });
  return row.id;
}


function toQuote(row: any): Quote {
  return {
    id: row.id,
    token: row.token,
    invoiceNumber: row.invoiceNumber ?? undefined,
    companyId: row.companyId ?? undefined,
    clientId: row.clientId ?? undefined,
    siteId: row.siteId ?? undefined,
    version: row.version != null ? Number(row.version) : undefined,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    siteAddress: row.siteAddress ?? undefined,
    notes: row.notes ?? undefined,
    vatRate: Number(row.vatRate),
    items: (row.items as any[]) as QuoteItem[],
    status: row.status,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
    acceptedAtISO: row.acceptedAt ? new Date(row.acceptedAt).toISOString() : undefined,
  };
}

function toAgreement(row: any): Agreement {
  return {
    id: row.id,
    companyId: row.companyId ?? undefined,
    token: row.token,
    quoteId: row.quoteId,
    status: row.status,
    templateVersion: row.templateVersion,
    quoteSnapshot: row.quoteSnapshot as Quote,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
    signedAtISO: row.signedAt ? new Date(row.signedAt).toISOString() : undefined,
    signerName: row.signerName ?? undefined,
    signerEmail: row.signerEmail ?? undefined,
    signerIp: row.signerIp ?? undefined,
    signerUserAgent: row.signerUserAgent ?? undefined,
    certificateHash: row.certificateHash ?? undefined,
    clientPdfKey: row.clientPdfKey ?? undefined,
    auditPdfKey: row.auditPdfKey ?? undefined,
    clientPdfAt: row.clientPdfAt ? new Date(row.clientPdfAt).toISOString() : undefined,
    auditPdfAt: row.auditPdfAt ? new Date(row.auditPdfAt).toISOString() : undefined,
  };
}

function toAudit(row: any): AuditEvent {
  return {
    id: row.id,
    entityType: row.entityType,
    entityId: row.entityId,
    action: row.action,
    actorRole: row.actorRole,
    actor: row.actor ?? undefined,
    meta: (row.meta as any) ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
  };
}


function toInvoice(row: any): Invoice {
  return {
    id: row.id,
    token: row.token,
    invoiceNumber: row.invoiceNumber ?? undefined,
    legalEntityId: row.legalEntityId ?? undefined,
    clientId: row.clientId ?? undefined,
    quoteId: row.quoteId ?? undefined,
    jobId: row.jobId ?? undefined,
    variationId: row.variationId ?? undefined,
    type: row.type ?? undefined,
    stageName: row.stageName ?? undefined,
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    subtotal: Number(row.subtotal),
    vat: Number(row.vat),
    total: Number(row.total),
    status: row.status,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
    sentAtISO: row.sentAt ? new Date(row.sentAt).toISOString() : undefined,
    dueAtISO: row.dueAt ? new Date(row.dueAt).toISOString() : undefined,
    paidAtISO: row.paidAt ? new Date(row.paidAt).toISOString() : undefined,
    xeroInvoiceId: row.xeroInvoiceId ?? undefined,
    xeroSyncStatus: row.xeroSyncStatus ?? undefined,
    xeroLastSyncAtISO: row.xeroLastSyncAt ? new Date(row.xeroLastSyncAt).toISOString() : undefined,
    xeroLastError: row.xeroLastError ?? undefined,
    paymentProvider: row.paymentProvider ?? undefined,
    paymentUrl: row.paymentUrl ?? undefined,
    paymentRef: row.paymentRef ?? undefined,
  };
}


function toClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? undefined,
    address1: row.address1 ?? undefined,
    address2: row.address2 ?? undefined,
    city: row.city ?? undefined,
    county: row.county ?? undefined,
    postcode: row.postcode ?? undefined,
    country: row.country ?? undefined,
    notes: row.notes ?? undefined,
    paymentTermsDays: row.paymentTermsDays != null ? Number(row.paymentTermsDays) : undefined,
    disableAutoChase: row.disableAutoChase != null ? Boolean(row.disableAutoChase) : undefined,
    xeroContactId: row.xeroContactId ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toSite(row: any): Site {
  return {
    id: row.id,
    clientId: row.clientId,
    name: row.name ?? undefined,
    address1: row.address1 ?? undefined,
    address2: row.address2 ?? undefined,
    city: row.city ?? undefined,
    county: row.county ?? undefined,
    postcode: row.postcode ?? undefined,
    country: row.country ?? undefined,
    notes: row.notes ?? undefined,
    paymentTermsDays: row.paymentTermsDays != null ? Number(row.paymentTermsDays) : undefined,
    disableAutoChase: row.disableAutoChase != null ? Boolean(row.disableAutoChase) : undefined,
    xeroContactId: row.xeroContactId ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toEngineer(row: any): Engineer {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? undefined,
    phone: row.phone ?? undefined,
    costRatePerHour: row.costRatePerHour != null ? Number(row.costRatePerHour) : undefined,
    chargeRatePerHour: row.chargeRatePerHour != null ? Number(row.chargeRatePerHour) : undefined,
    rateCardId: row.rateCardId ?? undefined,
    rateCardName: row.rateCard?.name ?? undefined,
    rateCardCostRate: row.rateCard?.costRatePerHour != null ? Number(row.rateCard.costRatePerHour) : undefined,
    rateCardChargeRate: row.rateCard?.chargeRatePerHour != null ? Number(row.rateCard.chargeRatePerHour) : undefined,
    isActive: row.isActive ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toJob(row: any): Job {
  return {
    id: row.id,
    quoteId: row.quoteId ?? "",
    clientId: row.clientId ?? undefined,
    siteId: row.siteId ?? undefined,
    title: row.title ?? undefined,
    status: row.status,
    engineerEmail: row.engineer?.email ?? undefined,
    scheduledAtISO: row.scheduledAt ? new Date(row.scheduledAt).toISOString() : undefined,
    notes: row.notes ?? undefined,
    budgetSubtotal: Number(row.budgetSubtotal ?? 0),
    budgetVat: Number(row.budgetVat ?? 0),
    budgetTotal: Number(row.budgetTotal ?? 0),
    // For backwards compatibility with existing UI
    clientName: row.client?.name ?? row.clientName ?? row.clientEmail ?? "",
    clientEmail: row.client?.email ?? row.clientEmail ?? "",
    client: row.client ? toClient(row.client) : undefined,
    siteName: row.site?.name ?? undefined,
    siteAddress: row.site? [row.site.address1, row.site.address2, row.site.city, row.site.county, row.site.postcode, row.site.country].filter(Boolean).join(", ") : row.siteAddress ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toScheduleEntry(row: any): ScheduleEntry {
  return {
    id: row.id,
    jobId: row.jobId,
    engineerId: row.engineerId,
    engineerEmail: row.engineer?.email ?? undefined,
    startAtISO: new Date(row.startAt).toISOString(),
    endAtISO: new Date(row.endAt).toISOString(),
    notes: row.notes ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toTimeEntry(row: any): TimeEntry {
  return {
    id: row.id,
    jobId: row.jobId,
    engineerId: row.engineerId,
    engineerEmail: row.engineer?.email ?? undefined,
    timesheetId: row.timesheetId ?? undefined,
    startedAtISO: new Date(row.startedAt).toISOString(),
    endedAtISO: row.endedAt ? new Date(row.endedAt).toISOString() : undefined,
    breakMinutes: Number(row.breakMinutes ?? 0),
    notes: row.notes ?? undefined,
    status: row.status ?? undefined,
    lockedAtISO: row.lockedAt ? new Date(row.lockedAt).toISOString() : undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toTimesheet(row: any): Timesheet {
  return {
    id: row.id,
    engineerId: row.engineerId,
    engineerEmail: row.engineer?.email ?? undefined,
    weekStartISO: new Date(row.weekStart).toISOString(),
    status: row.status,
    submittedAtISO: row.submittedAt ? new Date(row.submittedAt).toISOString() : undefined,
    approvedAtISO: row.approvedAt ? new Date(row.approvedAt).toISOString() : undefined,
    approvedBy: row.approvedBy ?? undefined,
    notes: row.notes ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toCostItem(row: any): CostItem {
  return {
    id: row.id,
    jobId: row.jobId,
    type: row.type,
    stageId: row.stageId ?? undefined,
    source: row.source ?? undefined,
    lockStatus: row.lockStatus ?? undefined,
    supplier: row.supplier ?? undefined,
    description: row.description,
    quantity: Number(row.quantity ?? 1),
    unitCost: Number(row.unitCost ?? 0),
    markupPct: Number(row.markupPct ?? 0),
    incurredAtISO: row.incurredAt ? new Date(row.incurredAt).toISOString() : undefined,
    totalCost: Number(row.totalCost ?? 0),
    attachments: Array.isArray(row.attachments) ? row.attachments.map(toCostItemAttachment) : undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toJobStage(row: any): JobStage {
  return {
    id: row.id,
    jobId: row.jobId,
    name: row.name,
    status: row.status,
    sortOrder: Number(row.sortOrder ?? 0),
    startedAtISO: row.startedAt ? new Date(row.startedAt).toISOString() : undefined,
    completedAtISO: row.completedAt ? new Date(row.completedAt).toISOString() : undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toSnagItem(row: any): SnagItem {
  return {
    id: row.id,
    jobId: row.jobId,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    resolvedAtISO: row.resolvedAt ? new Date(row.resolvedAt).toISOString() : undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toVariation(row: any): Variation {
  return {
    id: row.id,
    token: row.token ?? undefined,
    quoteId: row.quoteId ?? undefined,
    jobId: row.jobId ?? undefined,
    stageId: row.stageId ?? undefined,
    stageName: row.stage?.name ?? undefined,
    title: row.title,
    reason: row.reason ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    vatRate: Number(row.vatRate ?? 0.2),
    items: (row.items as any[]) as any,
    subtotal: Number(row.subtotal ?? 0),
    vat: Number(row.vat ?? 0),
    total: Number(row.total ?? 0),
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
    sentAtISO: row.sentAt ? new Date(row.sentAt).toISOString() : undefined,
    approvedAtISO: row.approvedAt ? new Date(row.approvedAt).toISOString() : undefined,
    rejectedAtISO: row.rejectedAt ? new Date(row.rejectedAt).toISOString() : undefined,
    approvedBy: row.approvedBy ?? undefined,
  };
}

function toQuoteRevision(row: any): QuoteRevision {
  return {
    id: row.id,
    quoteId: row.quoteId,
    version: Number(row.version),
    snapshot: row.snapshot as any,
    createdAtISO: new Date(row.createdAt).toISOString(),
  };
}

function toInvoiceAttachment(row: any): InvoiceAttachment {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    name: row.name,
    fileKey: row.fileKey,
    mimeType: row.mimeType,
    createdAtISO: new Date(row.createdAt).toISOString(),
  };
}

function toVariationAttachment(row: any): VariationAttachment {
  return {
    id: row.id,
    variationId: row.variationId,
    name: row.name,
    fileKey: row.fileKey ?? undefined,
    mimeType: row.mimeType,
    createdAtISO: new Date(row.createdAt).toISOString(),
  };
}

function toCostItemAttachment(row: any): CostItemAttachment {
  return {
    id: row.id,
    costItemId: row.costItemId,
    name: row.name,
    mimeType: row.mimeType,
    createdAtISO: new Date(row.createdAt).toISOString(),
  };
}

function toRateCard(row: any): RateCard {
  return {
    id: row.id,
    name: row.name,
    costRatePerHour: Number(row.costRatePerHour ?? 0),
    chargeRatePerHour: Number(row.chargeRatePerHour ?? 0),
    isDefault: row.isDefault ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toJobBudgetLine(row: any): JobBudgetLine {
  return {
    id: row.id,
    jobId: row.jobId,
    source: row.source,
    description: row.description,
    quantity: Number(row.quantity ?? 1),
    unitPrice: Number(row.unitPrice ?? 0),
    total: Number(row.total ?? 0),
    sortOrder: Number(row.sortOrder ?? 0),
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}


function toInvoicePayment(row: any): InvoicePayment {
  return {
    id: row.id,
    invoiceId: row.invoiceId,
    amount: Number(row.amount || 0),
    currency: String(row.currency || "gbp"),
    provider: (String(row.provider || "stripe") as any),
    status: (String(row.status || "succeeded") as any),
    providerRef: row.providerRef ?? undefined,
    receivedAtISO: new Date(row.receivedAt).toISOString(),
  };
}

function toSupplierBill(row: any): SupplierBill {
  return {
    id: row.id,
    jobId: row.jobId,
    supplier: row.supplier,
    reference: row.reference ?? undefined,
    billDateISO: row.billDate ? new Date(row.billDate).toISOString() : undefined,
    status: row.status ?? undefined,
    postedAtISO: row.postedAt ? new Date(row.postedAt).toISOString() : undefined,
    subtotal: Number(row.subtotal || 0),
    vat: Number(row.vat || 0),
    total: Number(row.total || 0),
    pdfKey: row.pdfKey ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toSupplierBillLine(row: any): SupplierBillLine {
  return {
    id: row.id,
    billId: row.billId,
    description: row.description,
    quantity: Number(row.quantity || 0),
    unitCost: Number(row.unitCost || 0),
    vatRate: Number(row.vatRate || 0),
    totalExVat: Number(row.totalExVat || 0),
    costItemId: row.costItemId ?? undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
  };
}

function toCertificate(row: any): Certificate {
  return {
    id: row.id,
    jobId: row.jobId ?? undefined,
    siteId: row.siteId ?? undefined,
    clientId: row.clientId ?? undefined,
    legalEntityId: row.legalEntityId ?? undefined,
    type: row.type,
    status: row.status,
    certificateNumber: row.certificateNumber ?? undefined,
    issuedAtISO: row.issuedAt ? new Date(row.issuedAt).toISOString() : undefined,
    inspectorName: row.inspectorName ?? undefined,
    inspectorEmail: row.inspectorEmail ?? undefined,
    dataVersion: Number(row.dataVersion ?? 1),
    data: normalizeCertificateData(row.type, row.data ?? {}),
    completedAtISO: row.completedAt ? new Date(row.completedAt).toISOString() : undefined,
    pdfKey: row.pdfKey ?? undefined,
    signedName: row.signedName ?? undefined,
    signedAtISO: row.signedAt ? new Date(row.signedAt).toISOString() : undefined,
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}

function toCertificateTestResult(row: any): CertificateTestResult {
  return {
    id: row.id,
    certificateId: row.certificateId,
    circuitRef: row.circuitRef ?? undefined,
    data: (row.data as any) ?? {},
    createdAtISO: new Date(row.createdAt).toISOString(),
    updatedAtISO: new Date(row.updatedAt).toISOString(),
  };
}


export async function listQuotes(): Promise<Quote[]> {
  const client = p();
  if (!client) return fileDb.listQuotes();
  const rows = await client.quote.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toQuote);
}

export async function listQuotesForClientEmail(email: string): Promise<Quote[]> {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) return [];
  const client = p();
  if (!client) return fileDb.listQuotesForClient({ email: normalized });
  const companyId = await requireCompanyIdForPrisma();
  const rows = await client.quote.findMany({
    where: { companyId, clientEmail: normalized },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toQuote);
}

export async function getQuoteById(id: string): Promise<Quote | null> {
  const client = p();
  if (!client) return fileDb.getQuoteById(id);
  const row = await client.quote.findUnique({ where: { id } });
  return row ? toQuote(row) : null;
}

export async function getQuoteByToken(token: string): Promise<Quote | null> {
  const client = p();
  if (!client) return fileDb.getQuoteByToken(token);
  const row = await client.quote.findUnique({ where: { token } });
  return row ? toQuote(row) : null;
}

export async function createQuote(input: {
  clientName: string;
  clientEmail: string;
  clientId?: string;
  siteId?: string;
  siteAddress?: string;
  notes?: string;
  vatRate?: number;
  items?: Array<Pick<QuoteItem, "description" | "qty" | "unitPrice">>;
}): Promise<Quote> {
  const client = p();
  if (!client) return fileDb.createQuote(input);

  // ✅ generate secure token
  const token = crypto.randomBytes(24).toString("hex");

  // ✅ if a clientId is provided, pull client details to prefill missing fields
  const clientRec = input.clientId
    ? await client.client.findUnique({ where: { id: input.clientId } })
    : null;

  const siteRec = input.siteId
    ? await client.site.findUnique({ where: { id: input.siteId } }).catch(() => null)
    : null;

  const resolvedName =
    String(input.clientName ?? "").trim() || (clientRec?.name ?? "");

  const resolvedEmail =
    String(input.clientEmail ?? "").trim().toLowerCase() ||
    (clientRec?.email ?? "");

  const resolvedSiteAddress =
    (siteRec
      ? [siteRec.address1, siteRec.address2, siteRec.city, siteRec.county, siteRec.postcode, siteRec.country]
          .filter(Boolean)
          .join(", ")
      : input.siteAddress?.trim()) ||
    [
      clientRec?.address1,
      clientRec?.address2,
      clientRec?.city,
      clientRec?.county,
      clientRec?.postcode,
      clientRec?.country,
    ]
      .filter(Boolean)
      .join(", ") ||
    null;

  // If caller didn't specify siteId but did provide a free-form address and we have a client, create a Site record.
  let resolvedSiteId: string | null = input.siteId ?? null;
  if (!resolvedSiteId && input.clientId) {
    resolvedSiteId = await ensureSiteFromFreeformAddress(input.clientId, resolvedSiteAddress);
  }

  const items: QuoteItem[] = (input.items ?? []).map((it) => ({
    id: crypto.randomUUID(),
    description: String(it.description ?? "").trim(),
    qty: Number(it.qty ?? 1),
    unitPrice: Number(it.unitPrice ?? 0),
  }));

  const row = await client.quote.create({
    data: { companyId: await requireCompanyIdForPrisma(),
      token,
      // ✅ FIX: this was "quote.clientId" (undefined)
      clientId: input.clientId ?? null,
      siteId: resolvedSiteId,
      clientName: resolvedName,
      clientEmail: resolvedEmail,
      siteAddress: resolvedSiteAddress,
      notes: input.notes?.trim() || null,
      vatRate: typeof input.vatRate === "number" ? input.vatRate : 0.2,
      items,
      status: "draft",
    },
  });

  await addAudit({
    entityType: "quote",
    entityId: row.id,
    action: "quote.created" as any,
    actorRole: "admin",
    meta: { clientEmail: row.clientEmail },
  });

  return toQuote(row);
}


export async function updateQuoteStatusSent(id: string): Promise<Quote | null> {
  const client = p();
  if (!client) return fileDb.updateQuote(id, { status: "sent" });
  const existing = await client.quote.findUnique({ where: { id } }).catch(() => null);
  if (!existing) return null;

  // If this is a draft -> sent transition, create a revision snapshot for audit + future dispute avoidance.
  if (existing.status === "draft") {
    const snap = toQuote(existing);
    await client.quoteRevision
      .create({ data: { quoteId: id, version: Number(existing.version ?? 1), snapshot: snap as any } as any })
      .catch(() => null);
  }

  const row = await client.quote
    .update({ where: { id }, data: { status: "sent", version: { increment: 1 } } as any })
    .catch(() => null);
  if (!row) return null;
  await addAudit({ entityType: "quote", entityId: id, action: "quote.sent" as any, actorRole: "admin" });
  return toQuote(row);
}


export async function updateQuoteClient(quoteId: string, clientId: string): Promise<Quote | null> {
  const client = p();
  if (!client) {
    const c = fileDb.getClientById(clientId);
    if (!c) return null;
    const siteAddress =
      [c.address1, c.address2, c.city, c.county, c.postcode, c.country].filter(Boolean).join(", ") || undefined;
    return fileDb.updateQuote(quoteId, {
      clientId,
      clientName: c.name,
      clientEmail: c.email,
      siteAddress,
    } as any);
  }

  const c = await client.client.findUnique({ where: { id: clientId } });
  if (!c) return null;
  const siteAddress =
    [c.address1, c.address2, c.city, c.county, c.postcode, c.country].filter(Boolean).join(", ") || null;

  const row = await client.quote
    .update({
      where: { id: quoteId },
      data: {
        clientId,
        clientName: c.name,
        clientEmail: c.email,
        siteAddress,
      },
    })
    .catch(() => null);
  return row ? toQuote(row) : null;
}


export async function rotateQuoteToken(id: string): Promise<Quote | null> {
  const client = p();
  if (!client) return fileDb.rotateQuoteToken(id);
  const token = crypto.randomBytes(24).toString("hex");
  const row = await client.quote.update({ where: { id }, data: { token } }).catch(() => null);
  if (!row) return null;
  await addAudit({ entityType: "quote", entityId: id, action: "token.rotated" as any, actorRole: "admin", meta: { info: "token.rotated" } });
  return toQuote(row);
}

export async function getAgreementForQuote(quoteId: string): Promise<Agreement | null> {
  const client = p();
  if (!client) return fileDb.getAgreementForQuote(quoteId);
  const row = await client.agreement.findUnique({ where: { quoteId } });
  return row ? toAgreement(row) : null;
}

export async function getAgreementById(id: string): Promise<Agreement | null> {
  const client = p();
  if (!client) {
    return null; // file-db mode: no direct lookup by id
  }
  const row = await client.agreement.findUnique({ where: { id } });
  return row ? toAgreement(row) : null;
}

export async function getAgreementByToken(token: string): Promise<Agreement | null> {
  const client = p();
  if (!client) return fileDb.getAgreementByToken(token);
  const row = await client.agreement.findUnique({ where: { token } });
  return row ? toAgreement(row) : null;
}

export async function ensureAgreementForQuote(quoteId: string): Promise<Agreement | null> {
  const client = p();
  if (!client) return fileDb.ensureAgreementForQuote(quoteId);

  const q = await client.quote.findUnique({ where: { id: quoteId } });
  if (!q) return null;

  const existing = await client.agreement.findUnique({ where: { quoteId } });
  if (existing) return toAgreement(existing);

  const token = crypto.randomBytes(24).toString("hex"); // ✅ define token

  const agCompanyId = (q as any).companyId ?? (await requireCompanyIdForPrisma().catch(() => null));
  if (!agCompanyId) return null;

  const row = await client.agreement.create({
    data: {
      id: crypto.randomUUID(),
      companyId: agCompanyId,
      token,
      quoteId,
      status: "draft",
      templateVersion: "v1",
      quoteSnapshot: toQuote(q),
      updatedAt: new Date(),
    },
  });

  await addAudit({
    entityType: "agreement",
    entityId: row.id,
    action: "agreement.created" as any,
    actorRole: "system",
    meta: { quoteId },
  }, agCompanyId);

  return toAgreement(row);
}


export async function acceptQuoteByToken(token: string): Promise<Quote | null> {
  const client = p();

  // ✅ FILE DB MODE: mirror the same side-effects
  if (!client) {
    const q = await fileDb.acceptQuoteByToken(token);
    if (!q) return null;

    // Ensure agreement exists (idempotent)
    try {
      await fileDb.ensureAgreementForQuote(q.id);
    } catch {}

    // ✅ Create draft invoice + job so /admin/jobs becomes deterministic
    try {
      await fileDb.ensureInvoiceForQuote(q.id);
    } catch {}
    try {
      await fileDb.ensureJobForQuote(q.id);
    } catch {}

    return q;
  }

  // ✅ PRISMA MODE
  const q = await client.quote.findUnique({ where: { token } });
  if (!q) return null;

  // If already accepted, we still ensure downstream objects (idempotent)
  const alreadyAccepted = q.status === "accepted";

  const row = alreadyAccepted
    ? q
    : await client.quote.update({
        where: { id: q.id },
        data: { status: "accepted", acceptedAt: new Date() },
      });

  const quoteCompanyId = (row as any).companyId ?? null;

  await addAudit({
    entityType: "quote",
    entityId: row.id,
    action: "quote.accepted" as any,
    actorRole: "client",
    actor: row.clientEmail,
  }, quoteCompanyId || undefined);

  // Ensure agreement exists (idempotent)
  await ensureAgreementForQuote(row.id);

  // ✅ NEW: ensure job + draft invoice exist after acceptance (idempotent)
  try { await ensureInvoiceForQuote(row.id); } catch {}
  try { await ensureJobForQuote(row.id); } catch {}

  return toQuote(row);
}

export async function signAgreementByToken(
  token: string,
  input: { signerName: string; signerEmail?: string; signerIp?: string; signerUserAgent?: string }
): Promise<Agreement | null> {
  const client = p();

  // ✅ FILE DB MODE: we MUST mirror the Prisma side-effects (invoice + job)
  if (!client) {
    const a = await fileDb.signAgreementByToken(token, input);
    if (!a) return null;

    // These two side-effects are what your Playwright test is waiting for.
    // Make them idempotent so repeated calls are safe.
    try {
      await fileDb.ensureJobForQuote(a.quoteId);
    } catch {}
    try {
    await fileDb.ensureInvoiceForQuote(a.quoteId);  
    } catch {}

    return a;
  }

  // ---------------- Prisma mode (unchanged from your code) ----------------
  const a = await client.agreement.findUnique({ where: { token } });
  if (!a) return null;
  if (a.status === "signed") return toAgreement(a);

  const signedAt = new Date();
  const next = {
    ...a,
    status: "signed",
    signerName: String(input.signerName ?? "").trim(),
    signerEmail: input.signerEmail?.trim()?.toLowerCase() || null,
    signerIp: input.signerIp || null,
    signerUserAgent: input.signerUserAgent || null,
    signedAt,
  };

  const certHash = fileDb.computeAgreementCertificateHash({
    ...toAgreement(next),
    signedAtISO: signedAt.toISOString(),
  });

  const row = await client.agreement.update({
    where: { id: a.id },
    data: {
      status: "signed",
      signerName: next.signerName,
      signerEmail: next.signerEmail,
      signerIp: next.signerIp,
      signerUserAgent: next.signerUserAgent,
      signedAt,
      certificateHash: certHash,
    },
  });

  await addAudit({
    entityType: "agreement",
    entityId: row.id,
    action: "agreement.signed" as any,
    actorRole: "client",
    actor: row.signerEmail ?? undefined,
    meta: { signerName: row.signerName },
  });

  // ✅ Create job first (so invoice can link immediately)
  await ensureJobForQuote(row.quoteId);

  // ✅ Then draft invoice (idempotent)
  await ensureInvoiceForQuote(row.quoteId);

  // Generate and store both PDFs
  const signed = toAgreement({ ...row, certificateHash: certHash });
  try {
    const brand = await getBrandContextForCompanyId(row.companyId);
    const [clientPdf, auditPdf] = await Promise.all([
      renderClientAgreementPdf(signed, brand),
      renderAuditAgreementPdf(signed),
    ]);
    const clientPdfKey = `agreements/${row.id}/client.pdf`;
    const auditPdfKey = `agreements/${row.id}/audit.pdf`;
    writeUploadBytes(clientPdfKey, clientPdf);
    writeUploadBytes(auditPdfKey, auditPdf);
    await setAgreementPdfKeys(row.id, { clientPdfKey, auditPdfKey });
  } catch {
    // PDF generation failures should not block signing
  }

  return signed;
}

export async function setAgreementPdfKeys(
  agreementId: string,
  keys: { clientPdfKey?: string; auditPdfKey?: string }
): Promise<void> {
  const client = p();
  if (!client) return; // file-db mode: keys stored on disk by convention
  const data: Record<string, unknown> = {};
  if (keys.clientPdfKey) {
    data.clientPdfKey = keys.clientPdfKey;
    data.clientPdfAt = new Date();
  }
  if (keys.auditPdfKey) {
    data.auditPdfKey = keys.auditPdfKey;
    data.auditPdfAt = new Date();
  }
  if (Object.keys(data).length > 0) {
    await client.agreement.update({ where: { id: agreementId }, data });
  }
}

export async function listAuditForEntity(entityType: AuditEvent["entityType"], entityId: string): Promise<AuditEvent[]> {
  const client = p();
  if (!client) return fileDb.listAuditForEntity(entityType, entityId);
  const rows = await client.auditEvent.findMany({ where: { entityType, entityId }, orderBy: { createdAt: "desc" } });
  return rows.map(toAudit);
}

async function addAudit(event: Omit<AuditEvent, "id" | "createdAtISO">, companyIdOverride?: string) {
  const client = p();
  if (!client) {
    // fileDb has internal addAudit; use recordEmailSent etc. We'll piggyback by calling recordEmailSent for email actions.
    // For non-email actions we rely on fileDb functions which already add audit.
    return;
  }
  const companyId = companyIdOverride ?? (await requireCompanyIdForPrisma());
  await client.auditEvent.create({
    data: {
      id: crypto.randomUUID(),
      companyId,
      entityType: event.entityType,
      entityId: event.entityId,
      action: event.action,
      actorRole: event.actorRole,
      actor: event.actor || null,
      meta: (event.meta as any) || null,
      quoteId: event.entityType === "quote" ? event.entityId : null,
      agreementId: event.entityType === "agreement" ? event.entityId : null,
      invoiceId: event.entityType === "invoice" ? event.entityId : null,
      jobId: event.entityType === "job" ? event.entityId : null,
      certificateId: event.entityType === "certificate" ? event.entityId : null,
    },
  });
}

export async function recordAuditEvent(event: Omit<AuditEvent, "id" | "createdAtISO">): Promise<void> {
  try {
    await addAudit(event);
  } catch (err) {
    if (isMissingCompanyError(err)) return;
    throw err;
  }
}

function isMissingCompanyError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = "status" in err ? (err as { status?: number }).status : undefined;
  const message = "message" in err ? (err as { message?: string }).message : undefined;
  return status === 401 && message === "Missing company context";
}

export async function recordEmailSent(input: { entityType: AuditEvent["entityType"]; entityId: string; actorRole: Role | "system"; actor?: string; meta?: Record<string, unknown>; companyId?: string }) {
  const client = p();
  if (!client) return fileDb.recordEmailSent(input);
  await addAudit({
    entityType: input.entityType,
    entityId: input.entityId,
    action: "email.sent" as any,
    actorRole: input.actorRole,
    actor: input.actor,
    meta: input.meta,
  }, input.companyId);
}

export async function recordEmailFailed(input: { entityType: AuditEvent["entityType"]; entityId: string; actorRole: Role | "system"; actor?: string; meta?: Record<string, unknown>; companyId?: string }) {
  const client = p();
  if (!client) return fileDb.recordEmailFailed(input);
  await addAudit({
    entityType: input.entityType,
    entityId: input.entityId,
    action: "email.failed" as any,
    actorRole: input.actorRole,
    actor: input.actor,
    meta: input.meta,
  }, input.companyId);
}

export async function listFailedEmailAttempts(input: { companyId?: string; limit?: number } = {}): Promise<AuditEvent[]> {
  const client = p();
  const limit = input.limit ?? 200;
  if (!client) return fileDb.listFailedEmailAttempts(limit);
  const companyId = input.companyId ?? (await requireCompanyIdForPrisma());
  const rows = await client.auditEvent.findMany({
    where: { companyId, action: "email.failed" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toAudit);
}


// ------------------ Invoices ------------------

export async function listInvoices(): Promise<Invoice[]> {
  const client = p();
  if (!client) return fileDb.listInvoices();
  const companyId = await requireCompanyIdForPrisma();
  const rows = await client.invoice.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });

  return rows.map(toInvoice);
}

export async function listInvoicesForClientEmail(email: string): Promise<Invoice[]> {
  const client = p();
  const e = String(email || "").trim().toLowerCase();
  if (!e) return [];
  if (!client) return fileDb.listInvoicesForClientEmail(e);
  const rows = await client.invoice.findMany({ where: { clientEmail: e }, orderBy: { createdAt: "desc" } });
  return rows.map(toInvoice);
}

export async function listInvoicesForJob(jobId: string): Promise<Invoice[]> {
  const client = p();
  if (!client) return [];
  const rows = await client.invoice.findMany({ where: { jobId }, orderBy: { createdAt: "desc" } }).catch(() => [] as any[]);
  return rows.map(toInvoice);
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  const client = p();
  if (!client) return fileDb.getInvoiceById(id);
  const row = await client.invoice.findUnique({ where: { id } });
  return row ? toInvoice(row) : null;
}

export async function getInvoiceByToken(token: string): Promise<Invoice | null> {
  const client = p();
  if (!client) return fileDb.getInvoiceByToken(token);
  const row = await client.invoice.findUnique({ where: { token } });
  return row ? toInvoice(row) : null;
}

export async function listInvoiceAttachments(invoiceId: string): Promise<InvoiceAttachment[]> {
  const client = p();
  if (!client) return [];
  const rows = await client.invoiceAttachment.findMany({ where: { invoiceId }, orderBy: { createdAt: "asc" } }).catch(() => [] as any[]);
  return rows.map(toInvoiceAttachment);
}

export async function listVariationAttachments(variationId: string): Promise<VariationAttachment[]> {
  const client = p();
  if (!client) return [];
  const companyId = await requireCompanyIdForPrisma();
  const rows = await client.variationAttachment
    .findMany({ where: { variationId, companyId }, orderBy: { createdAt: "asc" } })
    .catch(() => [] as any[]);
  return rows.map(toVariationAttachment);
}

export async function addInvoiceAttachment(input: { invoiceId: string; name: string; fileKey: string; mimeType: string }): Promise<InvoiceAttachment | null> {
  const client = p();
  if (!client) return null;
  const row = await client.invoiceAttachment
    .create({ data: { invoiceId: input.invoiceId, name: input.name, fileKey: input.fileKey, mimeType: input.mimeType } as any })
    .catch(() => null);
  return row ? toInvoiceAttachment(row) : null;
}

export async function addVariationAttachment(input: { variationId: string; name: string; fileKey: string; mimeType: string }): Promise<VariationAttachment | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const row = await client.variationAttachment
    .create({ data: { companyId, variationId: input.variationId, name: input.name, fileKey: input.fileKey, mimeType: input.mimeType } })
    .catch(() => null);
  return row ? toVariationAttachment(row) : null;
}

export async function listCostItemAttachments(costItemId: string): Promise<CostItemAttachment[]> {
  const client = p();
  if (!client) return [];
  const companyId = await requireCompanyIdForPrisma();
  const rows = await client.costItemAttachment.findMany({ where: { costItemId, companyId }, orderBy: { createdAt: "asc" } }).catch(() => [] as any[]);
  return rows.map(toCostItemAttachment);
}

export async function addCostItemAttachment(input: { costItemId: string; name: string; fileKey: string; mimeType: string }): Promise<CostItemAttachment | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const row = await client.costItemAttachment
    .create({ data: { companyId, costItemId: input.costItemId, name: input.name, fileKey: input.fileKey, mimeType: input.mimeType } })
    .catch(() => null);
  return row ? toCostItemAttachment(row) : null;
}

export async function getCostItemAttachmentById(id: string): Promise<CostItemAttachment | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const row = await client.costItemAttachment.findUnique({ where: { id } }).catch(() => null);
  if (!row || row.companyId !== companyId) return null;
  return toCostItemAttachment(row);
}

export async function getStoredCostItemAttachment(id: string): Promise<{ name: string; fileKey: string; mimeType: string } | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const row = await client.costItemAttachment.findUnique({ where: { id } }).catch(() => null);
  if (!row || row.companyId !== companyId) return null;
  return { name: row.name, fileKey: row.fileKey, mimeType: row.mimeType };
}

export async function getVariationAttachmentById(id: string): Promise<VariationAttachment | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const row = await client.variationAttachment.findUnique({ where: { id } }).catch(() => null);
  if (!row || row.companyId !== companyId) return null;
  return toVariationAttachment(row);
}


export async function listInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
  const client = p();
  if (!client) return [];
  const rows = await client.invoicePayment.findMany({ where: { invoiceId }, orderBy: { receivedAt: "desc" } }).catch(() => [] as any[]);
  return rows.map(toInvoicePayment);
}

export async function getInvoicePaymentSummary(invoiceId: string): Promise<{ totalPaid: number; balanceDue: number; payments: InvoicePayment[] } | null> {
  const client = p();
  if (!client) return null;
  const inv = await client.invoice.findUnique({ where: { id: invoiceId } }).catch(() => null);
  if (!inv) return null;
  const payments = await listInvoicePayments(invoiceId);
  const sum = payments.filter((p) => p.status === "succeeded").reduce((a, p) => a + Number(p.amount || 0), 0);
  const totalPaid = Number(sum);
  const balanceDue = Math.max(0, Number(inv.total || 0) - totalPaid);
  return { totalPaid, balanceDue, payments };
}

// ✅ PATCH 2: ensureInvoiceForQuote — always attach jobId if a job exists
export async function ensureInvoiceForQuote(quoteId: string): Promise<Invoice | null> {
  const client = p();
  if (!client) return fileDb.ensureInvoiceForQuote(quoteId);

  const q = await client.quote.findUnique({ where: { id: quoteId } }).catch(() => null);
  if (!q) return null;

  const companyId = (q as any).companyId ?? (await requireCompanyIdForPrisma().catch(() => null));
  if (!companyId) return null;

  const existing = await client.invoice.findFirst({ where: { quoteId } }).catch(() => null);
if (existing) {
  // ✅ backfill jobId if job exists now
  if (!existing.jobId) {
    const job = await client.job.findFirst({ where: { quoteId } }).catch(() => null);
    if (job) {
      const updated = await client.invoice
        .update({ where: { id: existing.id }, data: { jobId: job.id } as any })
        .catch(() => null);
      if (updated) return toInvoice(updated);
    }
  }
  return toInvoice(existing);
}

  const quote = toQuote(q);
  const totals = fileDb.quoteTotals(quote);

  const token = crypto.randomBytes(24).toString("hex");
  const invoiceNumber = await allocateInvoiceNumber(client);

  const row = await client.invoice.create({
    data: {
      id: crypto.randomUUID(),
      companyId,
      token,
      invoiceNumber,
      clientId: quote.clientId ?? null,
      quoteId,
      jobId: null,
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      subtotal: totals.subtotal,
      vat: totals.vat,
      total: totals.total,
      status: "draft",
      updatedAt: new Date(),
    },
  });

  await addAudit(
    { entityType: "invoice", entityId: row.id, action: "invoice.created" as any, actorRole: "admin", meta: { quoteId } },
    companyId ?? undefined
  );

  // If a job already exists for this quote, link it.
  const job = await client.job.findFirst({ where: { quoteId } }).catch(() => null);
  if (job) {
    const updated = await client.invoice.update({ where: { id: row.id }, data: { jobId: job.id } as any }).catch(() => null);
    if (updated) return toInvoice(updated);
  }

  return toInvoice(row);
}


type VariationLite = { id: string; subtotal?: unknown; vat?: unknown; stage?: { name?: string | null } | null };
type InvoiceVariationRowLite = { variationId: string | null };

export async function createInvoiceForJob(input: {
  jobId: string;
  type: Invoice["type"];
  stageName?: string;
  variationId?: string;
  subtotal: number;
  vatRate?: number;
  status?: Invoice["status"];
}): Promise<Invoice | null> {
  const client = p();
  if (!client) return null;

  const companyId = await requireCompanyIdForPrisma();
  const job = await client.job
    .findUnique({ where: { id: input.jobId }, include: { client: true, quote: true } })
    .catch(() => null);
  if (!job) return null;

  // Resolve legal entity for this invoice
  const legalEntityResolution = await resolveLegalEntity({ jobId: input.jobId });
  const legalEntityId = legalEntityResolution?.legalEntityId ?? null;

  let vatRate = typeof input.vatRate === "number"
    ? input.vatRate
    : job.quote
      ? Number(job.quote.vatRate ?? 0.2)
      : 0.2;

  let subtotal = clampMoney(Number(input.subtotal ?? 0));
  const type = (input.type ?? "stage") as any;

  // UNIQUENESS GUARD: Check if a final/completion invoice already exists
  if (type === "final") {
    const existingFinalInvoice = await client.invoice
      .findFirst({
        where: {
          companyId,
          jobId: job.id,
          type: "final",
        },
      })
      .catch(() => null);

    if (existingFinalInvoice) {
      console.log(`[UNIQUENESS VIOLATION] Final invoice already exists for job ${job.id}`);
      return toInvoice(existingFinalInvoice);
    }
  }

  let includedVariations: Variation[] = [];

  // ---- Variation invoice (single approved variation) ----
  if (type === "variation" && input.variationId) {
    const variation = await client.variation.findUnique({ where: { id: input.variationId } }).catch(() => null);
    if (!variation || variation.jobId !== input.jobId || variation.status !== "approved") return null;

    const existing =
      (await client.invoice.findFirst({ where: { variationId: input.variationId } }).catch(() => null)) ||
      (await client.invoiceVariation
        .findFirst({ where: { companyId, variationId: input.variationId } })
        .catch(() => null));

    if (existing) {
      // invoiceVariation row (join table) -> load invoice
      if ("invoiceId" in (existing as any)) {
        const row = await client.invoice.findUnique({ where: { id: (existing as any).invoiceId } }).catch(() => null);
        return row ? toInvoice(row) : null;
      }
      // direct invoice row
      return toInvoice(existing as any);
    }

    vatRate = Number((variation as any).vatRate ?? vatRate);
    subtotal = clampMoney(Number((variation as any).subtotal ?? subtotal));
    includedVariations = [variation as any];
  }

  // ---- Stage invoice (includes any unbilled approved variations for that stage) ----
  if (type === "stage") {
    const stageName = input.stageName?.trim().toLowerCase();

    // UNIQUENESS GUARD: Check if a stage invoice already exists for this stage
    if (stageName) {
      const existingStageInvoice = await client.invoice
        .findFirst({
          where: {
            companyId,
            jobId: job.id,
            type: "stage",
            stageName: {
              equals: input.stageName,
              mode: "insensitive",
            },
          },
        })
        .catch(() => null);

      if (existingStageInvoice) {
        console.log(`[UNIQUENESS VIOLATION] Stage invoice already exists for job ${job.id}, stage "${input.stageName}"`);
        return toInvoice(existingStageInvoice);
      }
    }

    const approvedVariations = await client.variation
      .findMany({ where: { jobId: job.id, status: "approved" }, include: { stage: true } })
      .catch(() => [] as any[]);

    const scopedVariations = approvedVariations.filter((variation: VariationLite) => {
      if (!stageName) return true;
      const vStageName = String(variation.stage?.name || "").trim().toLowerCase();
      return vStageName && vStageName === stageName;
    });

    if (scopedVariations.length) {
      const variationIds = scopedVariations.map((v: VariationLite) => v.id);

      const billed = await client.invoiceVariation
        .findMany({ where: { companyId, variationId: { in: variationIds } }, select: { variationId: true } })
        .catch(() => [] as any[]);

      const billedDirect = await client.invoice
        .findMany({ where: { companyId, variationId: { in: variationIds } }, select: { variationId: true } })
        .catch(() => [] as any[]);

      const billedIds = new Set([
        ...(billed as InvoiceVariationRowLite[]).map((r) => r.variationId),
        ...(billedDirect as InvoiceVariationRowLite[]).map((r) => r.variationId),
      ]);

      includedVariations = scopedVariations.filter((v: VariationLite) => !billedIds.has(v.id)) as any[];

      const extraSubtotal = includedVariations.reduce((sum, v: any) => sum + Number(v.subtotal || 0), 0);
      const extraVat = includedVariations.reduce((sum, v: any) => sum + Number(v.vat || 0), 0);

      const baseSubtotal = subtotal;
      const totalSubtotal = clampMoney(baseSubtotal + extraSubtotal);

      // Use centralized VAT calculation for base amount
      const baseVatCalc = calculateVATFromSubtotal(baseSubtotal, vatRate);
      const totalVat = clampMoney(baseVatCalc.vat + extraVat);
      const total = clampMoney(totalSubtotal + totalVat);

      // Validate final calculation
      const finalCalc = { subtotal: totalSubtotal, vat: totalVat, total, vatRate };
      if (!validateVATCalculation(finalCalc)) {
        console.error(`[VAT ERROR] Invalid VAT calculation for stage invoice: ${JSON.stringify(finalCalc)}`);
      }

      const token = crypto.randomBytes(24).toString("hex");
      // Use per-entity invoice numbering when legal entity is available
      const invoiceNumber = legalEntityId
        ? await allocateInvoiceNumberForEntity(legalEntityId)
        : await allocateInvoiceNumber(client);

      const created = await client.$transaction(async (tx: any) => {
        const inv = await tx.invoice.create({
          data: {
            companyId,
            token,
            invoiceNumber,
            legalEntityId,
            clientId: job.clientId ?? null,
            quoteId: job.quoteId ?? null,
            jobId: job.id,
            variationId: null,
            type,
            stageName: input.stageName ?? null,
            clientName: job.client?.name ?? job.quote?.clientName ?? job.clientId ?? "",
            clientEmail: job.client?.email ?? job.quote?.clientEmail ?? "",
            subtotal: totalSubtotal,
            vat: totalVat,
            total,
            status: (input.status ?? "draft") as any,
          },
        });

        if (includedVariations.length) {
          await tx.invoiceVariation.createMany({
            data: includedVariations.map((v: any) => ({
              companyId,
              invoiceId: inv.id,
              variationId: v.id,
            })),
            skipDuplicates: true,
          });
        }

        return inv;
      });

      await addAudit({
        entityType: "invoice",
        entityId: created.id,
        action: "invoice.created" as any,
        actorRole: "admin",
        meta: {
          jobId: job.id,
          type,
          stageName: input.stageName,
          variationId: input.variationId,
          variationIds: includedVariations.map((v: any) => v.id),
        },
      });

      // attach cert PDFs for completion invoices
      const isCompletionInvoice =
        type === "final" || (type === "stage" && input.stageName && /complete|completion/i.test(input.stageName));

      if (isCompletionInvoice) {
        const certs = await client.certificate
          .findMany({ where: { jobId: job.id, status: "issued", pdfKey: { not: null } } })
          .catch(() => [] as any[]);
        for (const c of certs) {
          const fileKey = String((c as any).pdfKey || "");
          if (!fileKey) continue;
          await client.invoiceAttachment
            .create({
              data: {
                invoiceId: created.id,
                name: `${(c as any).type} Certificate`,
                fileKey,
                mimeType: "application/pdf",
              },
            })
            .catch(() => null);
        }
      }

      return toInvoice(created);
    }
  }

  // ---- Normal invoice (no extra variations bundled) ----
  // Use centralized VAT calculation
  const vatCalc = calculateVATFromSubtotal(subtotal, vatRate);

  // Validate calculation
  if (!validateVATCalculation(vatCalc)) {
    console.error(`[VAT ERROR] Invalid VAT calculation for invoice: ${JSON.stringify(vatCalc)}`);
  }

  const { vat, total } = vatCalc;

  const token = crypto.randomBytes(24).toString("hex");
  // Use per-entity invoice numbering when legal entity is available
  const invoiceNumber = legalEntityId
    ? await allocateInvoiceNumberForEntity(legalEntityId)
    : await allocateInvoiceNumber(client);

  const created = await client.$transaction(async (tx: any) => {
    const inv = await tx.invoice.create({
      data: {
        companyId,
        token,
        invoiceNumber,
        legalEntityId,
        clientId: job.clientId ?? null,
        quoteId: job.quoteId ?? null,
        jobId: job.id,
        variationId: input.variationId ?? null,
        type,
        stageName: input.stageName ?? null,
        clientName: job.client?.name ?? job.quote?.clientName ?? job.clientId ?? "",
        clientEmail: job.client?.email ?? job.quote?.clientEmail ?? "",
        subtotal,
        vat,
        total,
        status: (input.status ?? "draft") as any,
      },
    });

    if (includedVariations.length) {
      await tx.invoiceVariation.createMany({
        data: includedVariations.map((v: any) => ({
          companyId,
          invoiceId: inv.id,
          variationId: v.id,
        })),
        skipDuplicates: true,
      });
    }

    return inv;
  });

  await addAudit({
    entityType: "invoice",
    entityId: created.id,
    action: "invoice.created" as any,
    actorRole: "admin",
    meta: {
      jobId: job.id,
      type,
      stageName: input.stageName,
      variationId: input.variationId,
      variationIds: includedVariations.map((v: any) => v.id),
    },
  });

  const isCompletionInvoice =
    type === "final" || (type === "stage" && input.stageName && /complete|completion/i.test(input.stageName));

  if (isCompletionInvoice) {
    const certs = await client.certificate
      .findMany({ where: { jobId: job.id, status: "issued", pdfKey: { not: null } } })
      .catch(() => [] as any[]);
    for (const c of certs) {
      const fileKey = String((c as any).pdfKey || "");
      if (!fileKey) continue;
      await client.invoiceAttachment
        .create({
          data: {
            invoiceId: created.id,
            name: `${(c as any).type} Certificate`,
            fileKey,
            mimeType: "application/pdf",
          },
        })
        .catch(() => null);
    }
  }

  return toInvoice(created);
}

export async function updateInvoiceStatus(id: string, status: Invoice["status"]): Promise<Invoice | null> {
  const client = p();
  if (!client) return fileDb.updateInvoice(id, { status });

  const data: any = { status };
  const now = new Date();

  if (status === "sent" || status === "unpaid") {
    data.sentAt = now;

    // Compute due date if not already set
    const inv = await client.invoice.findUnique({ where: { id }, select: { dueAt: true, clientId: true, clientEmail: true, companyId: true, sentAt: true } }).catch(() => null);
    if (inv && !inv.dueAt) {
      // Payment terms: client override > company default
      const company = await client.company.findUnique({ where: { id: inv.companyId }, select: { defaultPaymentTermsDays: true } }).catch(() => null);
      const cl = inv.clientId
        ? await client.client.findUnique({ where: { id: inv.clientId }, select: { paymentTermsDays: true } }).catch(() => null)
        : await client.client.findFirst({ where: { companyId: inv.companyId, email: inv.clientEmail }, select: { paymentTermsDays: true } }).catch(() => null);

      const termsDays = Number(cl?.paymentTermsDays ?? company?.defaultPaymentTermsDays ?? 14);
      const due = new Date(now.getTime() + Math.max(0, termsDays) * 24 * 60 * 60 * 1000);
      data.dueAt = due;
    }
  }

  if (status === "paid") data.paidAt = now;

  const row = await client.invoice.update({ where: { id }, data }).catch(() => null);
  if (!row) return null;

  const action = status === "sent" ? "invoice.sent" : status === "unpaid" ? "invoice.unpaid" : status === "paid" ? "invoice.paid" : null;
  if (action) await addAudit({ entityType: "invoice", entityId: id, action: action as any, actorRole: "admin" });
  return toInvoice(row);
}

export async function markInvoiceSent(id: string): Promise<Invoice | null> {
  return updateInvoiceStatus(id, "sent");
}



export async function runInvoiceAutoChase(input: { dryRun?: boolean; companyId?: string } = {}): Promise<{ ok: true; examined: number; sent: number; skipped: number }> {
  const client = p();
  if (!client) throw new Error("prisma_required");

  const companyId = input.companyId ?? (await requireCompanyIdForPrisma());
  const company = await client.company.findUnique({ where: { id: companyId }, select: { autoChaseEnabled: true } }).catch(() => null);
  if (!company?.autoChaseEnabled) {
    return { ok: true, examined: 0, sent: 0, skipped: 0 };
  }

  const now = new Date();
  const invoices = await client.invoice
    .findMany({
      where: {
        companyId,
        status: { in: ["sent", "unpaid"] },
        paidAt: null,
        dueAt: { not: null },
      },
      include: { payments: true, client: true },
      orderBy: { dueAt: "asc" },
      take: 500,
    })
    .catch(() => [] as any[]);

  let examined = 0;
  let sent = 0;
  let skipped = 0;

  for (const inv of invoices) {
    examined++;
    const dueAt = inv.dueAt ? new Date(inv.dueAt) : null;
    if (!dueAt) {
      skipped++;
      continue;
    }

    const clientRow = inv.client || (inv.clientId ? await client.client.findUnique({ where: { id: inv.clientId } }).catch(() => null) : null);
    if (clientRow?.disableAutoChase) {
      skipped++;
      continue;
    }

    const totalPaid = (inv.payments || []).filter((p: any) => String(p.status) === "succeeded").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const balance = Number(inv.total || 0) - totalPaid;
    if (balance <= 0.01) {
      skipped++;
      continue;
    }

    const overdueDays = Math.floor((now.getTime() - dueAt.getTime()) / (24 * 60 * 60 * 1000));
    if (overdueDays < 7) {
      skipped++;
      continue;
    }

    const kind = overdueDays >= 21 ? "reminder_21" : overdueDays >= 14 ? "reminder_14" : "reminder_7";

    const already = await client.invoiceChase
      .findUnique({ where: { companyId_invoiceId_kind: { companyId, invoiceId: inv.id, kind } } })
      .catch(() => null);
    if (already) {
      skipped++;
      continue;
    }

    if (!input.dryRun) {
      // Record chase first (idempotent guard)
      await client.invoiceChase
        .create({
          data: {
            companyId,
            invoiceId: inv.id,
            kind,
            meta: { overdueDays, balance },
          },
        })
        .catch(() => null);

      // Send reminder email (best-effort)
      const shareLink = absoluteUrl(`/client/invoices/${inv.token}`);
      const payLink = inv.paymentUrl ? absoluteUrl(inv.paymentUrl) : undefined;
      await sendInvoiceReminder({
        companyId,
        to: inv.clientEmail,
        clientName: inv.clientName,
        invoiceId: inv.id,
        shareLink,
        payLink,
        totals: { subtotal: Number(inv.subtotal || 0), vat: Number(inv.vat || 0), total: Number(inv.total || 0) },
        balanceDue: balance,
      }).catch(() => null);

      await addAudit({
        entityType: "invoice",
        entityId: inv.id,
        action: "invoice.chased" as any,
        actorRole: "admin",
        meta: { kind, overdueDays, balance },
      }).catch(() => null);

      sent++;
    } else {
      sent++; // count as would-send
    }
  }

  return { ok: true, examined, sent, skipped };
}

export async function retryFailedXeroSync(input: { companyId?: string; limit?: number; dryRun?: boolean } = {}): Promise<{ ok: true; examined: number; reset: number; skipped: number }> {
  const client = p();
  if (!client) return { ok: true, examined: 0, reset: 0, skipped: 0 };

  const companyId = input.companyId ?? (await requireCompanyIdForPrisma());
  const limit = input.limit ?? 200;
  const invoices = await client.invoice
    .findMany({
      where: { companyId, xeroSyncStatus: { in: ["error", "failed"] } },
      select: { id: true },
      orderBy: { updatedAt: "asc" },
      take: limit,
    })
    .catch(() => [] as any[]);

  const examined = invoices.length;
  if (!examined) return { ok: true, examined: 0, reset: 0, skipped: 0 };
  if (input.dryRun) return { ok: true, examined, reset: examined, skipped: 0 };

  const ids = invoices.map((inv: any) => inv.id);
  const res = await client.invoice.updateMany({
    where: { companyId, id: { in: ids } },
    data: { xeroSyncStatus: "not_synced", xeroLastError: null, xeroLastSyncAt: new Date() },
  });
  return { ok: true, examined, reset: res.count, skipped: examined - res.count };
}

export async function recordInvoicePayment(input: {
  invoiceId: string;
  amount: number;
  currency?: string;
  provider?: string;
  providerRef?: string;
  status?: string;
}): Promise<{ invoice: Invoice | null; totalPaid: number }> {
  const client = p();
  if (!client) return { invoice: null, totalPaid: 0 };
  const inv = await client.invoice.findUnique({ where: { id: input.invoiceId } }).catch(() => null);
  if (!inv) return { invoice: null, totalPaid: 0 };
  const companyId = inv.companyId;
  await client.invoicePayment
    .create({
      data: {
        companyId,
        invoiceId: inv.id,
        amount: Number(input.amount || 0),
        currency: String(input.currency || inv.currency || "gbp"),
        provider: String(input.provider || "stripe"),
        status: String(input.status || "succeeded"),
        providerRef: input.providerRef ? String(input.providerRef) : null,
      },
    })
    .catch(() => null);

  const sum = await client.invoicePayment
    .aggregate({ where: { invoiceId: inv.id, status: "succeeded" }, _sum: { amount: true } })
    .catch(() => ({ _sum: { amount: 0 } } as any));
  const totalPaid = Number(sum?._sum?.amount || 0);

  if (totalPaid >= Number(inv.total || 0) && inv.status !== "paid") {
    await updateInvoiceStatus(inv.id, "paid");
  }
  const fresh = await client.invoice.findUnique({ where: { id: inv.id } }).catch(() => null);
  return { invoice: fresh ? toInvoice(fresh) : null, totalPaid };
}

export async function createPaymentLinkForInvoice(id: string): Promise<Invoice | null> {
  const client = p();
  if (!client) return fileDb.createPaymentLinkForInvoice(id);
  // Prisma schema may not have payment fields yet; fall back gracefully.
  const ref = crypto.randomBytes(8).toString("hex");
  const inv = await client.invoice.findUnique({ where: { id } });
  if (!inv) return null;
  const paymentUrl = `/client/invoices/${inv.token}?pay=1&ref=${ref}`;
  const data: Record<string, unknown> = {
    status: inv.status === "draft" ? "unpaid" : inv.status,
    paymentProvider: "demo",
    paymentUrl,
    paymentRef: ref,
  };
  const row = await client.invoice
    .update({
      where: { id },
      data: data as any,
    })
    .catch(() => null);
  if (!row) return null;
  await addAudit({ entityType: "invoice", entityId: id, action: "payment.link.created" as any, actorRole: "admin", meta: { paymentUrl } });
  return toInvoice(row as any);
}

export async function setInvoicePaymentSession(input: {
  invoiceId: string;
  provider: "stripe" | string;
  paymentUrl: string;
  paymentRef: string;
}): Promise<Invoice | null> {
  const client = p();
  if (!client) return null;
  const row = await client.invoice
    .update({
      where: { id: input.invoiceId },
      data: {
        paymentProvider: input.provider,
        paymentUrl: input.paymentUrl,
        paymentRef: input.paymentRef,
        status: "unpaid",
      },
    })
    .catch(() => null);
  return row ? toInvoice(row) : null;
}

export async function findInvoiceByPaymentRef(paymentRef: string): Promise<Invoice | null> {
  const client = p();
  if (!client) return null;
  const row = await client.invoice.findFirst({ where: { paymentRef: String(paymentRef || "") } }).catch(() => null);
  return row ? toInvoice(row) : null;
}

export async function markInvoicePaidByToken(token: string): Promise<Invoice | null> {
  const client = p();
  if (!client) return fileDb.markInvoicePaidByToken(token);
  const inv = await client.invoice.findUnique({ where: { token } });
  if (!inv) return null;
  if (inv.status === "paid") return toInvoice(inv);
  const row = await client.invoice.update({ where: { id: inv.id }, data: { status: "paid", paidAt: new Date() } });
  await addAudit({ entityType: "invoice", entityId: row.id, action: "invoice.paid" as any, actorRole: "client", actor: row.clientEmail });
  return toInvoice(row);
}

// ------------------ Jobs ------------------

async function ensureEngineerByEmail(email: string): Promise<Engineer | null> {
  const client = p();
  if (!client) return null;
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  const existing = await client.engineer.findFirst({ where: { email: e }, include: { rateCard: true } }).catch(() => null);
  if (existing) return toEngineer(existing);
  const defaultCost = process.env.QT_DEFAULT_COST_RATE_PER_HOUR ? Number(process.env.QT_DEFAULT_COST_RATE_PER_HOUR) : undefined;
  const companyId = await requireCompanyIdForPrisma();
  const defaultRateCard = await client.rateCard.findFirst({ where: { companyId, isDefault: true } }).catch(() => null);
  const row = await client.engineer
    .create({ data: { companyId, email: e, costRatePerHour: defaultCost ?? null, rateCardId: defaultRateCard?.id ?? null, isActive: true }, include: { rateCard: true } })
    .catch(() => null);
  return row ? toEngineer(row) : null;
}

export async function listEngineers(): Promise<Engineer[]> {
  const client = p();
  if (!client) {
    // fileDb has no first-class engineers; return a demo list if provided
    const raw = process.env.QT_ENGINEER_EMAILS || "";
    const emails = raw.split(",").map((s) => s.trim()).filter(Boolean);
    return emails.map((email) => ({ id: email, email, createdAtISO: new Date().toISOString(), updatedAtISO: new Date().toISOString() })) as any;
  }
  const companyId = await getCompanyId();
  const rows = await client.engineer.findMany({
    where: { isActive: true, ...(companyId ? { companyId } : {}) },
    orderBy: { createdAt: "desc" },
    include: { rateCard: true }
  });
  return rows.map(toEngineer);
}

export async function createEngineer(data: { email: string; name?: string; phone?: string }): Promise<Engineer | null> {
  const client = p();
  if (!client) return null;
  const email = String(data.email || "").trim().toLowerCase();
  if (!email) return null;

  // Check if engineer already exists
  const existing = await client.engineer.findFirst({ where: { email }, include: { rateCard: true } }).catch(() => null);
  if (existing) return toEngineer(existing);

  const companyId = await requireCompanyIdForPrisma();
  const defaultRateCard = await client.rateCard.findFirst({ where: { companyId, isDefault: true } }).catch(() => null);

  const row = await client.engineer
    .create({
      data: {
        companyId,
        email,
        name: data.name || null,
        phone: data.phone || null,
        rateCardId: defaultRateCard?.id ?? null,
        isActive: true,
      },
      include: { rateCard: true },
    })
    .catch(() => null);

  return row ? toEngineer(row) : null;
}

export async function listRateCards(): Promise<RateCard[]> {
  const client = p();
  if (!client) return [];
  const companyId = await requireCompanyIdForPrisma();
  const rows = await client.rateCard.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } }).catch(() => [] as any[]);
  return rows.map(toRateCard);
}

export async function createRateCard(input: { name: string; costRatePerHour?: number; chargeRatePerHour?: number; isDefault?: boolean }): Promise<RateCard | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const name = String(input.name || "").trim();
  if (!name) return null;
  if (input.isDefault) {
    await client.rateCard.updateMany({ where: { companyId, isDefault: true }, data: { isDefault: false } }).catch(() => null);
  }
  const row = await client.rateCard
    .create({
      data: {
        companyId,
        name,
        costRatePerHour: Number(input.costRatePerHour ?? 0),
        chargeRatePerHour: Number(input.chargeRatePerHour ?? 0),
        isDefault: Boolean(input.isDefault),
      },
    })
    .catch(() => null);
  return row ? toRateCard(row) : null;
}

export async function setEngineerRateCard(engineerId: string, rateCardId?: string): Promise<Engineer | null> {
  const client = p();
  if (!client) return null;
  const row = await client.engineer
    .update({ where: { id: engineerId }, data: { rateCardId: rateCardId || null }, include: { rateCard: true } })
    .catch(() => null);
  return row ? toEngineer(row) : null;
}

export async function deactivateEngineer(engineerId: string): Promise<boolean> {
  const client = p();
  if (!client) return false;
  const row = await client.engineer
    .update({ where: { id: engineerId }, data: { isActive: false } })
    .catch(() => null);
  return !!row;
}

export async function deleteEngineer(engineerId: string): Promise<boolean> {
  const client = p();
  if (!client) return false;
  // Soft delete by deactivating
  return deactivateEngineer(engineerId);
}

export async function listJobs(): Promise<Job[]> {
  const client = p();
  if (!client) return fileDb.listJobs();
  const companyId = await getCompanyId();
  const rows = await client.job.findMany({
    where: companyId ? { companyId } : {},
    orderBy: { createdAt: "desc" },
    include: { client: true, site: true, engineer: true },
  });
  return rows.map(toJob);
}

export async function listJobProfitability(opts?: { status?: string; query?: string }) {
  const client = p();
  if (!client) return [];
  const companyId = await requireCompanyIdForPrisma();
  const where: any = { companyId };
  if (opts?.status) where.status = opts.status;
  const rows = await client.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { client: true, site: true, engineer: true, jobBudgetLines: true },
  }).catch(() => [] as any[]);
  const query = String(opts?.query || "").trim().toLowerCase();
  const filtered = query
    ? rows.filter((row: any) =>
        [row.id, row.title, row.client?.name, row.client?.email, row.engineer?.email, row.status, row.site?.address1]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query))
      )
    : rows;
  if (!filtered.length) return [];
  const jobIds = filtered.map((row: any) => row.id);
  const costItems = await client.costItem.findMany({ where: { jobId: { in: jobIds }, companyId } }).catch(() => [] as any[]);
  const grouped = new Map<string, any[]>();
  for (const item of costItems) {
    const list = grouped.get(item.jobId) ?? [];
    list.push(item);
    grouped.set(item.jobId, list);
  }
  return filtered.map((row: any) => {
    const items = grouped.get(row.id) ?? [];

    // Use centralized pure functions for all financial calculations
    const financials = calculateJobFinancials(
      row.budgetLines as any,
      row.budgetSubtotal,
      items as any
    );

    return {
      job: toJob(row),
      summary: {
        jobId: row.id,
        ...financials,
      },
    };
  });
}

export async function getJobById(id: string) {
  const client = p();
  if (!client) {
    const j = fileDb.listJobs().find((x) => x.id === id) ?? null;
    return j as any;
  }
  const row = await client.job
    .findUnique({ where: { id }, include: { client: true, site: true, engineer: true } })
    .catch(() => null);
  return row ?? null;
}

/** Engineer RBAC: returns the job only if it is assigned to the engineer (by email). */
export async function getJobForEngineer(jobId: string, engineerEmail: string): Promise<Job | null> {
  const job = await getJobById(jobId);
  if (!job) return null;
  const email = String(engineerEmail || "").trim().toLowerCase();
  if (!email) return null;
  // If job has an assigned engineer email, enforce it strictly.
  if (job.engineerEmail) {
    return String(job.engineerEmail).trim().toLowerCase() === email ? job : null;
  }
  return null;
}

// ------------------ Schedule ------------------

export async function listScheduleEntries(fromISO: string, toISO: string): Promise<ScheduleEntry[]> {
  const client = p();
  if (!client) return fileDb.listScheduleEntries(fromISO, toISO) as any;
  const from = new Date(fromISO);
  const to = new Date(toISO);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];
  const rows = await client.scheduleEntry.findMany({
    where: { OR: [{ startAt: { lt: to } }, { endAt: { gt: from } }] },
    orderBy: { startAt: "asc" },
    include: { engineer: true },
  });
  // filter overlap correctly (Prisma OR above is broad)
  return rows
    .filter((r: any) => new Date(r.endAt).getTime() > from.getTime() && new Date(r.startAt).getTime() < to.getTime())
    .map(toScheduleEntry);
}

export async function listScheduleEntriesForEngineer(engineerEmail: string, fromISO: string, toISO: string): Promise<ScheduleEntry[]> {
  const client = p();
  if (!client) return fileDb.listScheduleEntriesForEngineer(engineerEmail, fromISO, toISO) as any;
  const eng = await ensureEngineerByEmail(engineerEmail);
  if (!eng) return [];
  const from = new Date(fromISO);
  const to = new Date(toISO);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];
  const rows = await client.scheduleEntry.findMany({
    where: { engineerId: eng.id, startAt: { lt: to }, endAt: { gt: from } },
    orderBy: { startAt: "asc" },
    include: { engineer: true },
  });
  return rows.map(toScheduleEntry);
}

export async function createScheduleEntry(input: {
  jobId: string;
  engineerEmail: string;
  startAtISO: string;
  endAtISO: string;
  notes?: string;
}): Promise<ScheduleEntry | null> {
  const client = p();
  if (!client) {
    return fileDb.createScheduleEntry({
      jobId: input.jobId,
      engineerId: input.engineerEmail,
      engineerEmail: input.engineerEmail,
      startAtISO: input.startAtISO,
      endAtISO: input.endAtISO,
      notes: input.notes,
    }) as any;
  }
  const eng = await ensureEngineerByEmail(input.engineerEmail);
  if (!eng) return null;
  const startAt = new Date(input.startAtISO);
  const endAt = new Date(input.endAtISO);
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) return null;
  const row = await client.scheduleEntry
    .create({
      data: { jobId: input.jobId,
        engineerId: eng.id,
        startAt,
        endAt,
        notes: input.notes ?? null,
      } as any as any,
      include: { engineer: true },
    })
    .catch(() => null);
  // also update job convenience fields
  if (row) {
    await client.job.update({ where: { id: input.jobId }, data: { scheduledAt: startAt, status: "scheduled", engineerId: eng.id } }).catch(() => null);
  }
  return row ? toScheduleEntry(row) : null;
}

export async function ensureJobForQuote(quoteId: string): Promise<Job | null> {
  const client = p();
  if (!client) return fileDb.ensureJobForQuote(quoteId) as any;

  const q = await client.quote.findUnique({ where: { id: quoteId } }).catch(() => null);
  if (!q) return null;

  const existing = await client.job
    .findFirst({ where: { quoteId }, include: { client: true, site: true, engineer: true } })
    .catch(() => null);

  if (existing) {
    const existingLines = await client.jobBudgetLine.count({ where: { jobId: existing.id } }).catch(() => 0);
    if (existingLines === 0) {
      await syncJobBudgetLinesFromQuote(existing.id, toQuote(q), { replace: true });
    }
    return toJob(existing);
  }

  const quote = toQuote(q);
  const totals = fileDb.quoteTotals(quote);

  const companyId = (q as any).companyId ?? (await requireCompanyIdForPrisma().catch(() => null));
  if (!companyId) return null;
  let siteId = (q as any).siteId ?? null;

  // Auto-create a site if the quote doesn't have one
  if (!siteId) {
    const clientId = (q as any).clientId ?? null;
    if (clientId) {
      // Try to find an existing site for this client
      const existingSite = await client.site.findFirst({
        where: { clientId, companyId },
        orderBy: { createdAt: "desc" },
      }).catch(() => null);
      if (existingSite) {
        siteId = existingSite.id;
      } else {
        // Create a default site
        const newSite = await client.site.create({
          data: {
            id: crypto.randomUUID(),
            companyId,
            clientId,
            name: quote.siteAddress || `${quote.clientName} - Default Site`,
            address1: quote.siteAddress || "",
            updatedAt: new Date(),
          },
        });
        siteId = newSite.id;
      }
      // Link site back to quote
      await client.quote.update({ where: { id: quoteId }, data: { siteId } }).catch(() => null);
    } else {
      // No client and no site — cannot create a job
      console.error(`[ensureJobForQuote] Quote ${quoteId} has no clientId and no siteId — skipping job creation`);
      return null;
    }
  }

  // Verify site exists and belongs to this company
  const siteRecord = await client.site.findUnique({ where: { id: siteId } }).catch(() => null);
  if (!siteRecord || siteRecord.companyId !== companyId) {
    console.error(`[SECURITY] Site ${siteId} from quote ${quoteId} doesn't belong to company ${companyId}`);
    throw new Error("Site does not belong to company");
  }

  const row = await client.job.create({
    data: {
      id: crypto.randomUUID(),
      companyId,
      quoteId,
      clientId: (q as any).clientId ?? null,
      siteId,
      title: `Job from Quote ${quoteId.slice(0, 8)}`,
      status: "new",
      budgetSubtotal: totals.subtotal,
      budgetVat: totals.vat,
      budgetTotal: totals.total,
      updatedAt: new Date(),
    },
    include: { client: true, site: true, engineer: true },
  });

  // If an invoice exists for the quote, associate it with the job.
  const inv = await client.invoice.findFirst({ where: { quoteId } }).catch(() => null);
  if (inv && !inv.jobId) {
    await client.invoice.update({ where: { id: inv.id }, data: { jobId: row.id } as any }).catch(() => null);
  }

  await syncJobBudgetLinesFromQuote(row.id, quote, { replace: true });
  await addAudit({ entityType: "job", entityId: row.id, action: "job.created" as any, actorRole: "system", meta: { quoteId } });

  return toJob(row);
}

export async function createManualJob(data: {
  clientId: string;
  siteId: string;
  title: string;
  description?: string;
}): Promise<Job | null> {
  const client = p();
  if (!client) return null;

  const companyId = await requireCompanyIdForPrisma();

  // INVARIANT: siteId is required - jobs must belong to a site
  if (!data.siteId) {
    console.error("[INVARIANT VIOLATION] createManualJob called without siteId");
    throw new Error("siteId is required for job creation");
  }

  // Get client and site info
  const clientRecord = await client.client.findUnique({ where: { id: data.clientId } }).catch(() => null);
  if (!clientRecord) {
    console.error(`[INVARIANT] Client ${data.clientId} not found for job creation`);
    return null;
  }

  // Verify site exists and belongs to this company
  const siteRecord = await client.site.findUnique({ where: { id: data.siteId } }).catch(() => null);
  if (!siteRecord || siteRecord.companyId !== companyId) {
    console.error(`[SECURITY] Site ${data.siteId} not found or doesn't belong to company ${companyId}`);
    return null;
  }

  const row = await client.job.create({
    data: {
      companyId,
      clientId: data.clientId,
      siteId: data.siteId,
      clientName: clientRecord.name,
      clientEmail: clientRecord.email,
      siteAddress: siteRecord.address || null,
      title: data.title,
      description: data.description || null,
      status: "new",
      budgetSubtotal: 0,
      budgetVat: 0,
      budgetTotal: 0,
    } as any,
    include: { client: true, site: true, engineer: true },
  });

  await addAudit({ entityType: "job", entityId: row.id, action: "job.created" as any, actorRole: "admin", meta: { manual: true } });

  return toJob(row);
}


export async function updateJob(id: string, patch: Partial<Job>): Promise<Job | null> {
  const client = p();
  if (!client) return fileDb.updateJob(id, patch as any) as any;

  const data: any = {};
  if (typeof patch.status === "string") data.status = patch.status;
  if (typeof patch.notes === "string") data.notes = patch.notes.trim() || null;
  if (typeof patch.title === "string") data.title = patch.title.trim() || null;
  if (typeof patch.scheduledAtISO === "string") data.scheduledAt = new Date(patch.scheduledAtISO);

  // CRITICAL: Enforce checklist completion gating
  if (typeof patch.status === "string" && (patch.status.toLowerCase() === "completed" || patch.status.toLowerCase() === "complete")) {
    const { validateJobCompletion } = await import("./checklistGating");
    const validation = await validateJobCompletion(id);
    if (!validation.allowed) {
      throw new Error(validation.reason || "Job cannot be completed");
    }
  }

  if (typeof patch.engineerEmail === "string") {
    const eng = await ensureEngineerByEmail(patch.engineerEmail);
    data.engineerId = eng ? eng.id : null;
    await addAudit({ entityType: "job", entityId: id, action: "job.assigned" as any, actorRole: "admin", meta: { engineerEmail: patch.engineerEmail } });
  }

  const row = await client.job.update({ where: { id }, data, include: { client: true, site: true, engineer: true } }).catch(() => null);
  if (!row) return null;
  if (data.status) {
    await addAudit({ entityType: "job", entityId: id, action: "job.status.changed" as any, actorRole: "admin", meta: { status: data.status } });
  }
  return toJob(row);
}

async function updateJobBudgetTotals(jobId: string, subtotal: number) {
  const client = p();
  if (!client) return;
  const job = await client.job.findUnique({ where: { id: jobId }, include: { quote: true } }).catch(() => null);
  if (!job) return;
  const vatRate = job.quote?.vatRate != null ? Number(job.quote.vatRate) : await client.company.findUnique({ where: { id: job.companyId }, select: { defaultVatRate: true } }).then((c: { defaultVatRate?: unknown | null } | null) => Number(c?.defaultVatRate ?? 0)).catch(() => 0);
  const safeSubtotal = clampMoney(subtotal);
  const vat = clampMoney(safeSubtotal * vatRate);
  const total = clampMoney(safeSubtotal + vat);
  await client.job.update({ where: { id: jobId }, data: { budgetSubtotal: safeSubtotal, budgetVat: vat, budgetTotal: total } }).catch(() => null);
}

async function syncJobBudgetLinesFromQuote(jobId: string, quote: Quote, opts?: { replace?: boolean }) {
  const client = p();
  if (!client) return;
  const companyId = await requireCompanyIdForPrisma();
  if (opts?.replace) {
    await client.jobBudgetLine.deleteMany({ where: { jobId, companyId } }).catch(() => null);
  }
  const items = Array.isArray(quote.items) ? quote.items : [];
  if (!items.length) return;
  await client.jobBudgetLine.createMany({
    data: items.map((item, idx) => ({
      id: crypto.randomUUID(),
      companyId,
      jobId,
      source: "quote",
      description: item.description,
      quantity: Number(item.qty ?? 1),
      unitPrice: Number(item.unitPrice ?? 0),
      total: Number(item.qty ?? 1) * Number(item.unitPrice ?? 0),
      sortOrder: idx,
    })),
  }).catch(() => null);
  const subtotal = items.reduce((sum, item) => sum + Number(item.qty ?? 1) * Number(item.unitPrice ?? 0), 0);
  await updateJobBudgetTotals(jobId, subtotal);
}

export async function listJobBudgetLines(jobId: string): Promise<JobBudgetLine[]> {
  const client = p();
  if (!client) return [];
  const companyId = await requireCompanyIdForPrisma();
  const rows = await client.jobBudgetLine.findMany({ where: { jobId, companyId }, orderBy: { sortOrder: "asc" } }).catch(() => [] as any[]);
  return rows.map(toJobBudgetLine);
}

export async function replaceJobBudgetLines(jobId: string, lines: Array<{ id?: string; description: string; quantity: number; unitPrice: number; source?: string }>): Promise<JobBudgetLine[] | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  await client.jobBudgetLine.deleteMany({ where: { jobId, companyId } }).catch(() => null);
  await client.jobBudgetLine.createMany({
    data: lines.map((line, idx) => ({
      id: crypto.randomUUID(),
      companyId,
      jobId,
      source: line.source || "override",
      description: line.description,
      quantity: Number(line.quantity ?? 0),
      unitPrice: Number(line.unitPrice ?? 0),
      total: Number(line.quantity ?? 0) * Number(line.unitPrice ?? 0),
      sortOrder: idx,
    })),
  }).catch(() => null);
  const subtotal = lines.reduce((sum, line) => sum + Number(line.quantity ?? 0) * Number(line.unitPrice ?? 0), 0);
  await updateJobBudgetTotals(jobId, subtotal);
  const rows = await client.jobBudgetLine.findMany({ where: { jobId }, orderBy: { sortOrder: "asc" } }).catch(() => [] as any[]);
  return rows.map(toJobBudgetLine);
}

export async function resetJobBudgetLinesFromQuote(jobId: string): Promise<JobBudgetLine[] | null> {
  const client = p();
  if (!client) return null;
  const job = await client.job.findUnique({ where: { id: jobId }, include: { quote: true } }).catch(() => null);
  if (!job?.quote) return null;
  await syncJobBudgetLinesFromQuote(jobId, toQuote(job.quote), { replace: true });
  const rows = await client.jobBudgetLine.findMany({ where: { jobId }, orderBy: { sortOrder: "asc" } }).catch(() => [] as any[]);
  return rows.map(toJobBudgetLine);
}

export async function listJobsForEngineer(email: string): Promise<Job[]> {
  const client = p();
  if (!client) return fileDb.listJobsForEngineer(email) as any;
  const e = String(email || "").trim().toLowerCase();
  if (!e) return [];
  const eng = await client.engineer.findFirst({ where: { email: e } }).catch(() => null);
  if (!eng) return [];
  const rows = await client.job.findMany({ where: { engineerId: eng.id }, orderBy: { createdAt: "desc" }, include: { client: true, site: true, engineer: true } });
  return rows.map(toJob);
}

// ------------------ Costing (Time + Cost items) ------------------

export async function listTimeEntries(jobId: string): Promise<TimeEntry[]> {
  const client = p();
  if (!client) return [];
  const rows = await client.timeEntry.findMany({ where: { jobId }, orderBy: { startedAt: "desc" }, include: { engineer: true } });
  return rows.map(toTimeEntry);
}

export async function addTimeEntry(input: { jobId: string; engineerEmail: string; startedAtISO: string; endedAtISO?: string; breakMinutes?: number; notes?: string }): Promise<TimeEntry | null> {
  const client = p();
  if (!client) return null;
  const eng = await ensureEngineerByEmail(input.engineerEmail);
  if (!eng) return null;

  // CRITICAL: Validate engineer has access to the job
  const job = await getJobForEngineer(input.jobId, input.engineerEmail);
  if (!job) {
    console.warn(`[SECURITY] Engineer ${input.engineerEmail} attempted to log time for unauthorized job ${input.jobId}`);
    return null;
  }

  await assertTimesheetEditable(client, eng.id, input.startedAtISO);
  const row = await client.timeEntry
    .create({
      data: { jobId: input.jobId,
        engineerId: eng.id,
        status: "draft",
        startedAt: new Date(input.startedAtISO),
        endedAt: input.endedAtISO ? new Date(input.endedAtISO) : null,
        breakMinutes: Number(input.breakMinutes ?? 0),
        notes: input.notes?.trim() || null,
      } as any,
      include: { engineer: true },
    })
    .catch(() => null);
  return row ? toTimeEntry(row) : null;
}

export async function getEngineerActiveTimer(engineerEmail: string): Promise<TimeEntry | null> {
  const client = p();
  if (!client) return null;
  const eng = await ensureEngineerByEmail(engineerEmail);
  if (!eng) return null;
  const row = await client.timeEntry.findFirst({
    where: { engineerId: eng.id, endedAt: null },
    orderBy: { startedAt: "desc" },
    include: { engineer: true },
  }).catch(() => null);
  return row ? toTimeEntry(row) : null;
}

export async function startEngineerTimer(input: { engineerEmail: string; jobId: string; notes?: string }): Promise<{ active: TimeEntry | null; started: TimeEntry | null }> {
  const client = p();
  if (!client) return { active: null, started: null };
  const eng = await ensureEngineerByEmail(input.engineerEmail);
  if (!eng) return { active: null, started: null };

  // CRITICAL: Validate engineer has access to the job
  const job = await getJobForEngineer(input.jobId, input.engineerEmail);
  if (!job) {
    console.warn(`[SECURITY] Engineer ${input.engineerEmail} attempted to start timer for unauthorized job ${input.jobId}`);
    return { active: null, started: null };
  }

  await assertTimesheetEditable(client, eng.id, new Date().toISOString());
  const existing = await client.timeEntry.findFirst({ where: { engineerId: eng.id, endedAt: null }, orderBy: { startedAt: "desc" }, include: { engineer: true } }).catch(() => null);
  const active = existing ? toTimeEntry(existing) : null;
  if (existing) return { active, started: null };

  const row = await client.timeEntry.create({
    data: {
      companyId: await requireCompanyIdForPrisma(),
      jobId: input.jobId,
      engineerId: eng.id,
      startedAt: new Date(),
      endedAt: null,
      breakMinutes: 0,
      notes: input.notes?.trim() || null,
      status: "draft",
    },
    include: { engineer: true },
  }).catch(() => null);
  return { active: row ? toTimeEntry(row) : null, started: row ? toTimeEntry(row) : null };
}

export async function stopEngineerTimer(engineerEmail: string): Promise<TimeEntry | null> {
  const client = p();
  if (!client) return null;
  const eng = await ensureEngineerByEmail(engineerEmail);
  if (!eng) return null;

  const existing = await client.timeEntry.findFirst({ where: { engineerId: eng.id, endedAt: null }, orderBy: { startedAt: "desc" } }).catch(() => null);
  if (!existing) return null;

  const row = await client.timeEntry.update({ where: { id: existing.id }, data: { endedAt: new Date() }, include: { engineer: true } }).catch(() => null);
  return row ? toTimeEntry(row) : null;
}

function startOfWeekMondayISO(dateISO: string): string {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  // Treat input as ISO in UTC; compute Monday 00:00 UTC to keep stable across deployments.
  const day = d.getUTCDay(); // 0=Sun
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

async function assertTimesheetEditable(client: ReturnType<typeof p>, engineerId: string, weekStartISO: string): Promise<Date> {
  const weekStart = new Date(startOfWeekMondayISO(weekStartISO));
  const existing = await client?.timesheet.findUnique({ where: { engineerId_weekStart: { engineerId, weekStart } } }).catch(() => null);
  if (existing?.status === "approved") {
    const error = new Error("Timesheet is approved and locked for this week.");
    (error as any).status = 409;
    throw error;
  }
  return weekStart;
}

export async function getOrCreateTimesheet(engineerEmail: string, weekStartISO: string): Promise<Timesheet | null> {
  const client = p();
  if (!client) return null;
  const eng = await ensureEngineerByEmail(engineerEmail);
  if (!eng) return null;
  const weekStart = new Date(startOfWeekMondayISO(weekStartISO));
  const existing = await client.timesheet.findUnique({ where: { engineerId: eng.id, weekStart } as any, include: { engineer: true } }).catch(() => null);
  if (existing) return toTimesheet(existing);
  const created = await client.timesheet.create({ data: { companyId: await requireCompanyIdForPrisma(), engineerId: eng.id, weekStart, status: "draft" }, include: { engineer: true } }).catch(() => null);
  return created ? toTimesheet(created) : null;
}

export async function listTimeEntriesForEngineerWeek(engineerEmail: string, weekStartISO: string): Promise<TimeEntry[]> {
  const client = p();
  if (!client) return [];
  const eng = await ensureEngineerByEmail(engineerEmail);
  if (!eng) return [];
  const weekStart = new Date(startOfWeekMondayISO(weekStartISO));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  const rows = await client.timeEntry.findMany({
    where: { engineerId: eng.id, startedAt: { gte: weekStart, lt: weekEnd } },
    orderBy: { startedAt: "asc" },
    include: { engineer: true },
  });
  return rows.map(toTimeEntry);
}

export async function submitTimesheet(engineerEmail: string, weekStartISO: string): Promise<Timesheet | null> {
  const client = p();
  if (!client) return null;
  const eng = await ensureEngineerByEmail(engineerEmail);
  if (!eng) return null;
  const weekStart = await assertTimesheetEditable(client, eng.id, weekStartISO);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const sheet = await client.timesheet.upsert({
    where: { engineerId: eng.id, weekStart } as any,
    create: { engineerId: eng.id, weekStart, status: "submitted", submittedAt: new Date() } as any,
    update: { status: "submitted", submittedAt: new Date() },
    include: { engineer: true },
  }).catch(() => null);
  if (!sheet) return null;

  // Attach draft/rejected entries for the week to this timesheet and mark as submitted.
  await client.timeEntry.updateMany({
    where: {
      engineerId: eng.id,
      startedAt: { gte: weekStart, lt: weekEnd },
      status: { in: ["draft", "rejected"] },
    },
    data: { timesheetId: sheet.id, status: "submitted" },
  }).catch(() => null);

  return toTimesheet(sheet);
}

export async function listTimesheets(opts: { companyId: string; status?: string }): Promise<Timesheet[]> {
  const client = p();
  if (!client) return [];
  const where: any = { companyId: opts.companyId };
  if (opts.status) where.status = opts.status;
  const rows = await client.timesheet.findMany({
    where,
    orderBy: { weekStart: "desc" },
    include: { engineer: true }
  });
  return rows.map(toTimesheet);
}

export async function getTimesheetById(id: string): Promise<(Timesheet & { entries: TimeEntry[] }) | null> {
  const client = p();
  if (!client) return null;
  const row = await client.timesheet.findUnique({ where: { id }, include: { engineer: true, timeEntries: { include: { engineer: true }, orderBy: { startedAt: "asc" } } } }).catch(() => null);
  if (!row) return null;
  return { ...toTimesheet(row), entries: row.timeEntries.map(toTimeEntry) };
}

export async function approveTimesheet(id: string, approverEmail: string): Promise<Timesheet | null> {
  const client = p();
  if (!client) return null;

  // Fetch current timesheet to check status
  const current = await client.timesheet.findUnique({ where: { id }, select: { status: true } }).catch(() => null);
  if (!current) return null;

  // IDEMPOTENCY: If already approved, return existing state without re-creating cost items
  if (current.status === "approved") {
    console.log(`[IDEMPOTENT] Timesheet ${id} already approved - no action taken`);
    const existing = await client.timesheet.findUnique({ where: { id }, include: { engineer: true } });
    return existing ? toTimesheet(existing) : null;
  }

  // CRITICAL: Use transaction to atomically approve timesheet AND create cost items
  // This prevents race conditions where two approvals could both create cost items
  try {
    const result = await client.$transaction(async (tx: any) => {
      // Re-check status inside transaction to prevent race condition
      const txCurrent = await tx.timesheet.findUnique({ where: { id }, select: { status: true } });

      if (!txCurrent) {
        throw new Error("Timesheet not found");
      }

      // IDEMPOTENCY GUARD: Only proceed if status is still not "approved"
      if (txCurrent.status === "approved") {
        console.log(`[RACE CONDITION PREVENTED] Timesheet ${id} was approved during processing`);
        return null;
      }

      // Update timesheet status atomically
      const sheet = await tx.timesheet.update({
        where: { id },
        data: {
          status: "approved",
          approvedAt: new Date(),
          approvedBy: String(approverEmail || "").trim().toLowerCase(),
        },
        include: { engineer: true },
      });

      // Lock time entries atomically
      await tx.timeEntry.updateMany({
        where: { timesheetId: id },
        data: { status: "approved", lockedAt: new Date() },
      });

      // Create labour cost items atomically within the same transaction
      await createLabourCostItemsForTimesheetTx(id, tx);

      return sheet;
    });

    // Transaction rolled back (likely due to race condition)
    if (!result) {
      const existing = await client.timesheet.findUnique({ where: { id }, include: { engineer: true } });
      return existing ? toTimesheet(existing) : null;
    }

    console.log(`[TIMESHEET APPROVED] Timesheet ${id} approved by ${approverEmail} with labour cost items created`);
    return toTimesheet(result);

  } catch (err) {
    console.error(`[ERROR] Failed to approve timesheet ${id}:`, err);
    return null;
  }
}

export async function rejectTimesheet(id: string, approverEmail: string, reason?: string): Promise<Timesheet | null> {
  const client = p();
  if (!client) return null;
  const sheet = await client.timesheet.update({ where: { id }, data: { status: "rejected", approvedAt: new Date(), approvedBy: String(approverEmail || "").trim().toLowerCase(), notes: reason?.trim() || null }, include: { engineer: true } }).catch(() => null);
  if (!sheet) return null;
  // Unlock entries for editing/resubmission
  await client.timeEntry.updateMany({ where: { timesheetId: id }, data: { status: "rejected", lockedAt: null } }).catch(() => null);
  return toTimesheet(sheet);
}

export async function listCostItems(jobId: string): Promise<CostItem[]> {
  const client = p();
  if (!client) return [];
  const companyId = await requireCompanyIdForPrisma();
  const rows = await client.costItem.findMany({ where: { jobId, companyId }, orderBy: { createdAt: "desc" }, include: { attachments: true } });
  return rows.map(toCostItem);
}

export async function addCostItem(input: {
  jobId: string;
  type: CostItem["type"];
  supplier?: string;
  description: string;
  quantity?: number;
  unitCost?: number;
  markupPct?: number;
  stageId?: string;
  source?: string;
  lockStatus?: string;
  incurredAtISO?: string;
}): Promise<CostItem | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const quantity = Number(input.quantity ?? 1);
  const unitCost = Number(input.unitCost ?? 0);
  const totalCost = quantity * unitCost;
  const row = await client.costItem
    .create({
      data: {
        companyId,
        jobId: input.jobId,
        stageId: input.stageId ?? null,
        type: input.type,
        source: input.source ?? "manual",
        lockStatus: input.lockStatus ?? "open",
        supplier: input.supplier?.trim() || null,
        description: input.description.trim(),
        quantity,
        unitCost,
        markupPct: Number(input.markupPct ?? 0),
        incurredAt: input.incurredAtISO ? new Date(input.incurredAtISO) : null,
        totalCost,
      },
      include: { attachments: true },
    })
    .catch(() => null);
  return row ? toCostItem(row) : null;
}

export async function updateCostItem(id: string, input: {
  description?: string;
  quantity?: number;
  unitCost?: number;
  markupPct?: number;
  supplier?: string;
}): Promise<CostItem | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();

  // Fetch existing cost item to check lock status
  const existing = await client.costItem.findFirst({ where: { id, companyId } }).catch(() => null);
  if (!existing) return null;

  // IMMUTABILITY GUARD: Locked cost items cannot be edited
  if (existing.lockStatus === "locked") {
    console.error(`[IMMUTABILITY VIOLATION] Attempt to update locked cost item ${id}`);
    throw new Error("Cannot update locked cost item");
  }

  // Only update if not locked
  const quantity = input.quantity !== undefined ? Number(input.quantity) : undefined;
  const unitCost = input.unitCost !== undefined ? Number(input.unitCost) : undefined;
  const totalCost = (quantity !== undefined && unitCost !== undefined)
    ? quantity * unitCost
    : (quantity !== undefined)
      ? quantity * Number(existing.unitCost ?? 0)
      : (unitCost !== undefined)
        ? Number(existing.quantity ?? 1) * unitCost
        : undefined;

  const row = await client.costItem.update({
    where: { id },
    data: {
      description: input.description?.trim(),
      quantity,
      unitCost,
      markupPct: input.markupPct !== undefined ? Number(input.markupPct) : undefined,
      supplier: input.supplier !== undefined ? (input.supplier?.trim() || null) : undefined,
      totalCost,
    },
    include: { attachments: true },
  }).catch(() => null);

  return row ? toCostItem(row) : null;
}

export async function deleteCostItem(id: string): Promise<boolean> {
  const client = p();
  if (!client) return false;
  const companyId = await requireCompanyIdForPrisma();

  // Fetch existing cost item to check lock status
  const existing = await client.costItem.findFirst({ where: { id, companyId } }).catch(() => null);
  if (!existing) return false;

  // IMMUTABILITY GUARD: Locked cost items cannot be deleted
  if (existing.lockStatus === "locked") {
    console.error(`[IMMUTABILITY VIOLATION] Attempt to delete locked cost item ${id}`);
    throw new Error("Cannot delete locked cost item");
  }

  // Only delete if not locked
  const deleted = await client.costItem.delete({ where: { id } }).catch(() => null);
  return deleted !== null;
}

export type SupplierBillCreateInput = {
  jobId: string;
  supplier: string;
  reference?: string;
  billDateISO?: string;
  subtotal: number;
  vat: number;
  total: number;
};

export async function listSupplierBills(jobId: string) {
  const client = p();
  if (!client) return [];
  const rows = await client.supplierBill.findMany({ where: { jobId, companyId: await requireCompanyIdForPrisma() }, orderBy: { createdAt: "desc" } }).catch(() => [] as any[]);
  return rows.map((r: any) => ({
    id: r.id,
    jobId: r.jobId,
    supplier: r.supplier,
    reference: r.reference ?? undefined,
    billDateISO: r.billDate ? new Date(r.billDate).toISOString() : undefined,
    status: r.status ?? undefined,
    postedAtISO: r.postedAt ? new Date(r.postedAt).toISOString() : undefined,
    subtotal: Number(r.subtotal || 0),
    vat: Number(r.vat || 0),
    total: Number(r.total || 0),
    pdfKey: r.pdfKey ?? undefined,
    createdAtISO: new Date(r.createdAt).toISOString(),
  }));
}

export async function createSupplierBill(input: SupplierBillCreateInput) {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const row = await client.supplierBill
    .create({
      data: {
        companyId,
        jobId: input.jobId,
        supplier: String(input.supplier || "").trim() || "Supplier",
        reference: input.reference ? String(input.reference).trim() : null,
        billDate: input.billDateISO ? new Date(input.billDateISO) : null,
        subtotal: Number(input.subtotal || 0),
        vat: Number(input.vat || 0),
        total: Number(input.total || 0),
      },
    })
    .catch(() => null);
  if (!row) return null;

  await addAudit({ entityType: "job", entityId: input.jobId, action: "supplier_bill.created" as any, actorRole: "admin", meta: { supplier: row.supplier, total: row.total } });
  return { id: row.id };
}

export async function getSupplierBillById(billId: string): Promise<SupplierBill | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const row = await client.supplierBill.findFirst({ where: { id: billId, companyId } }).catch(() => null);
  return row ? toSupplierBill(row) : null;
}

export async function setSupplierBillPdf(input: { billId: string; pdfKey: string }): Promise<SupplierBill | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const row = await client.supplierBill.update({ where: { id: input.billId }, data: { pdfKey: input.pdfKey } }).catch(() => null);
  if (!row || row.companyId != companyId) return null;
  return toSupplierBill(row);
}

export async function listSupplierBillLines(billId: string): Promise<SupplierBillLine[]> {
  const client = p();
  if (!client) return [];
  const companyId = await requireCompanyIdForPrisma();
  const rows = await client.supplierBillLine.findMany({ where: { billId, companyId }, orderBy: { createdAt: "asc" } }).catch(() => [] as any[]);
  return rows.map(toSupplierBillLine);
}

export async function replaceSupplierBillLines(input: { billId: string; lines: Array<{ id?: string; description: string; quantity: number; unitCost: number; vatRate: number }> }): Promise<SupplierBillLine[] | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const bill = await client.supplierBill.findFirst({ where: { id: input.billId, companyId } }).catch(() => null);
  if (!bill) return null;

  // Simplest: replace all lines
  await client.supplierBillLine.deleteMany({ where: { billId: input.billId, companyId } }).catch(() => null);
  for (const l of input.lines) {
    const qty = Number(l.quantity || 0) || 0;
    const unit = Number(l.unitCost || 0) || 0;
    const totalExVat = qty * unit;
    await client.supplierBillLine.create({ data: { companyId, billId: input.billId, description: l.description, quantity: qty, unitCost: unit, vatRate: Number(l.vatRate ?? 0.2), totalExVat } }).catch(() => null);
  }
  const rows = await client.supplierBillLine.findMany({ where: { billId: input.billId, companyId }, orderBy: { createdAt: "asc" } }).catch(() => [] as any[]);
  return rows.map(toSupplierBillLine);
}

export async function postSupplierBill(billId: string): Promise<SupplierBill | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();

  const bill = await client.supplierBill.findFirst({ where: { id: billId, companyId }, include: { lines: true } }).catch(() => null);
  if (!bill) return null;

  // IDEMPOTENCY: If already posted, return existing state without re-creating cost items
  if (bill.status === "posted") {
    console.log(`[IDEMPOTENT] Supplier bill ${billId} already posted - no action taken`);
    return toSupplierBill(bill);
  }

  // CRITICAL: Use transaction to atomically post bill AND create cost items
  // This prevents race conditions where two post requests could both create cost items
  try {
    const result = await client.$transaction(async (tx: any) => {
      // Re-check status inside transaction to prevent race condition
      const txBill = await tx.supplierBill.findFirst({ where: { id: billId, companyId }, include: { lines: true } });

      if (!txBill) {
        throw new Error("Supplier bill not found");
      }

      // IDEMPOTENCY GUARD: Only proceed if status is still not "posted"
      if (txBill.status === "posted") {
        console.log(`[RACE CONDITION PREVENTED] Supplier bill ${billId} was posted during processing`);
        return null;
      }

      // Create cost items for each bill line atomically
      for (const line of txBill.lines) {
        // Skip if cost item already exists (partial idempotency within transaction)
        if (line.costItemId) continue;

        const source = `supplier_bill_line:${line.id}`;
        const totalCost = Number(line.quantity ?? 0) * Number(line.unitCost ?? 0);

        // INVARIANT: Supplier bill cost items are ALWAYS locked when posted
        const costItem = await tx.costItem.create({
          data: {
            companyId,
            jobId: txBill.jobId,
            type: "material",
            source,
            lockStatus: "locked",
            supplier: txBill.supplier,
            description: line.description,
            quantity: Number(line.quantity ?? 0),
            unitCost: Number(line.unitCost ?? 0),
            markupPct: 0,
            incurredAt: txBill.billDate ?? txBill.createdAt,
            totalCost,
          },
        });

        // Link cost item back to bill line
        await tx.supplierBillLine.update({ where: { id: line.id }, data: { costItemId: costItem.id } });

        console.log(`[SUPPLIER COST CREATED] Job ${txBill.jobId}: ${line.description} = ${totalCost} (locked)`);
      }

      // Mark bill as posted atomically
      const updated = await tx.supplierBill.update({
        where: { id: billId },
        data: { status: "posted", postedAt: new Date() },
      });

      return updated;
    });

    // Transaction rolled back (likely due to race condition)
    if (!result) {
      const existing = await client.supplierBill.findFirst({ where: { id: billId, companyId } });
      return existing ? toSupplierBill(existing) : null;
    }

    console.log(`[SUPPLIER BILL POSTED] Bill ${billId} posted with cost items created`);
    return toSupplierBill(result);

  } catch (err) {
    console.error(`[ERROR] Failed to post supplier bill ${billId}:`, err);
    return null;
  }
}


function hoursBetween(startedAt: Date, endedAt: Date, breakMinutes: number) {
  const ms = endedAt.getTime() - startedAt.getTime() - breakMinutes * 60_000;
  return Math.max(0, ms / 3_600_000);
}

// Transaction-safe version that accepts a Prisma transaction client
async function createLabourCostItemsForTimesheetTx(timesheetId: string, tx: Tx) {
  const entries = await tx.timeEntry.findMany({
    where: { timesheetId },
    include: { engineer: { include: { rateCard: true } } },
  }).catch(() => [] as any[]);

  for (const entry of entries) {
    if (!entry.endedAt) continue;

    const source = `timesheet:${entry.id}`;

    // IDEMPOTENCY: Check if cost item already exists for this time entry
    const existing = await tx.costItem.findFirst({ where: { jobId: entry.jobId, source } }).catch(() => null);
    if (existing) {
      console.log(`[IDEMPOTENT] Cost item for time entry ${entry.id} already exists - skipping`);
      continue;
    }

    const hours = hoursBetween(entry.startedAt, entry.endedAt, Number(entry.breakMinutes ?? 0));
    if (hours <= 0) continue;

    const rate = entry.engineer?.rateCard?.costRatePerHour != null
      ? Number(entry.engineer.rateCard.costRatePerHour)
      : entry.engineer?.costRatePerHour != null
        ? Number(entry.engineer.costRatePerHour)
        : process.env.QT_DEFAULT_COST_RATE_PER_HOUR
          ? Number(process.env.QT_DEFAULT_COST_RATE_PER_HOUR)
          : 0;

    const totalCost = hours * rate;

    // INVARIANT: Labour cost items are ALWAYS locked when created from timesheet approval
    await tx.costItem.create({
      data: {
        companyId: entry.companyId,
        jobId: entry.jobId,
        type: "labour",
        source,
        lockStatus: "locked",
        supplier: entry.engineer?.name ?? entry.engineer?.email ?? null,
        description: `Labour (${entry.engineer?.name ?? entry.engineer?.email ?? "Engineer"})`,
        quantity: hours,
        unitCost: rate,
        markupPct: 0,
        incurredAt: entry.endedAt ?? entry.startedAt,
        totalCost,
      },
    });

    console.log(`[LABOUR COST CREATED] Job ${entry.jobId}: ${hours}h @ ${rate}/h = ${totalCost} (locked)`);
  }
}

// Legacy version for backwards compatibility (not transaction-safe)
async function createLabourCostItemsForTimesheet(timesheetId: string) {
  const client = p();
  if (!client) return;
  await createLabourCostItemsForTimesheetTx(timesheetId, client);
}

export async function getJobCosting(jobId: string, _opts?: { includeUnapproved?: boolean }): Promise<JobCostingSummary | null> {
  const client = p();
  if (!client) return null;
  const job = await client.job.findUnique({ where: { id: jobId }, include: { budgetLines: true } }).catch(() => null);
  if (!job) return null;

  const costs = await client.costItem.findMany({ where: { jobId } });

  // Use centralized pure functions for all financial calculations
  const financials = calculateJobFinancials(
    job.budgetLines as any,
    job.budgetSubtotal,
    costs as any
  );

  return {
    jobId,
    ...financials,
  };
}

// ------------------ Certificates ------------------

export async function listCertificatesForJob(jobId: string): Promise<Certificate[]> {
  const client = p();
  if (!client) return [];
  const rows = await client.certificate.findMany({ where: { jobId }, orderBy: { createdAt: "desc" } });
  return rows.map(toCertificate);
}

export async function listCertificatesForSite(siteId: string): Promise<Certificate[]> {
  const client = p();
  if (!client) return [];
  const rows = await client.certificate.findMany({ where: { siteId }, orderBy: { createdAt: "desc" } });
  return rows.map(toCertificate);
}

export async function listIssuedCertificatesForClientEmail(email: string): Promise<Certificate[]> {
  const client = p();
  if (!client) return [];
  const e = String(email || "").trim().toLowerCase();
  if (!e) return [];
  // Join via Client table when available
  const c = await client.client.findFirst({ where: { email: e } }).catch(() => null);
  if (!c) return [];
  const rows = await client.certificate
    .findMany({ where: { clientId: c.id, status: "issued", pdfKey: { not: null } }, orderBy: { issuedAt: "desc" } })
    .catch(() => [] as any[]);
  return rows.map(toCertificate);
}

export async function createCertificate(input: { jobId: string; type: CertificateType }): Promise<Certificate | null> {
  const client = p();
  if (!client) return null;
  const job = await client.job.findUnique({ where: { id: input.jobId }, include: { client: true, site: true, engineer: true } }).catch(() => null);
  if (!job) return null;

  // Resolve legal entity for this certificate
  const legalEntityResolution = await resolveLegalEntity({ jobId: input.jobId });
  const legalEntityId = legalEntityResolution?.legalEntityId ?? null;

  const siteAddress = job.site
    ? [job.site.address1, job.site.address2, job.site.city, job.site.county, job.site.postcode, job.site.country].filter(Boolean).join(", ")
    : (job as any).siteAddress ?? "";
  const template = getCertificateTemplate(input.type, {
    jobId: job.id,
    siteName: job.site?.name ?? (job as any).siteName ?? undefined,
    siteAddress,
    clientName: job.client?.name ?? (job as any).clientName ?? undefined,
    clientEmail: job.client?.email ?? (job as any).clientEmail ?? undefined,
    jobDescription: job.title ?? job.notes ?? undefined,
    inspectorName: job.engineer?.name ?? undefined,
  });
  const row = await client.certificate
    .create({
      data: { jobId: job.id,
        siteId: job.siteId,
        clientId: job.clientId,
        legalEntityId,
        type: input.type,
        status: "draft",
        inspectorName: job.engineer?.name ?? null,
        inspectorEmail: job.engineer?.email ?? null,
        dataVersion: template.version,
        data: template as any,
      } as any,
    })
    .catch(() => null);
  if (!row) return null;
  await addAudit({ entityType: "certificate", entityId: row.id, action: "certificate.created" as any, actorRole: "admin", meta: { jobId: job.id } });
  return toCertificate(row);
}

export async function updateCertificate(
  id: string,
  patch: Partial<
    Pick<Certificate, "certificateNumber" | "inspectorName" | "inspectorEmail" | "signedName" | "type" | "status">
  > & { dataVersion?: number; data?: Certificate["data"]; completedAtISO?: string }
): Promise<Certificate | null> {
  const client = p();
  if (!client) return null;

  // Fetch existing certificate to check status
  const existing = await client.certificate.findUnique({ where: { id }, select: { status: true } }).catch(() => null);
  if (!existing) return null;

  // IMMUTABILITY GUARD: Completed and issued certificates cannot be edited
  if (existing.status === "completed" || existing.status === "issued") {
    console.error(`[IMMUTABILITY VIOLATION] Attempt to update ${existing.status} certificate ${id}`);
    throw new Error(`Cannot update ${existing.status} certificate - certificates are immutable after completion`);
  }

  const row = await client.certificate
    .update({
      where: { id },
      data: {
        certificateNumber: patch.certificateNumber ?? undefined,
        inspectorName: patch.inspectorName ?? undefined,
        inspectorEmail: patch.inspectorEmail ? String(patch.inspectorEmail).trim().toLowerCase() : undefined,
        signedName: patch.signedName ?? undefined,
        type: patch.type ?? undefined,
        status: patch.status ?? undefined,
        dataVersion: typeof patch.dataVersion === "number" ? patch.dataVersion : undefined,
        data: patch.data ? (patch.data as any) : undefined,
        completedAt: patch.completedAtISO ? new Date(patch.completedAtISO) : undefined,
      },
    })
    .catch(() => null);
  return row ? toCertificate(row) : null;
}

export async function completeCertificate(id: string, actorRole: Role | "system" = "engineer"): Promise<Certificate | null> {
  const client = p();
  if (!client) return null;
  const existing = await client.certificate.findUnique({ where: { id } }).catch(() => null);
  if (!existing) return null;

  // Cannot complete void or already issued certificates
  if (existing.status === "void" || existing.status === "issued") return null;

  // IDEMPOTENCY: If already completed, return existing
  if (existing.status === "completed") {
    console.log(`[IDEMPOTENT] Certificate ${id} already completed - no action taken`);
    return toCertificate(existing);
  }

  // Normalize and validate certificate data
  const data = normalizeCertificateData(existing.type as any, existing.data ?? {});

  // STRICT VALIDATION: Use comprehensive schema validation
  const validation = validateCertificateForCompletion(existing.type as any, data);

  if (!validation.ok) {
    console.error(`[VALIDATION FAILED] Certificate ${id} cannot be completed:`, validation.errors);
    throw new Error(`Certificate validation failed: ${validation.errors.join(", ")}`);
  }

  // Additional lightweight check (backwards compatibility)
  if (!isCertificateReadyForCompletion(data)) {
    console.error(`[VALIDATION FAILED] Certificate ${id} missing required fields`);
    throw new Error("Certificate is missing required fields for completion");
  }

  const completedAt = new Date();
  const customerSignature = data.signatures?.customer;

  // Mark as completed
  const row = await client.certificate
    .update({
      where: { id },
      data: {
        status: "completed",
        completedAt,
        signedName: customerSignature?.name ?? undefined,
        signedAt: customerSignature?.signedAtISO ? new Date(customerSignature.signedAtISO) : undefined,
        dataVersion: data.version,
        data: data as any,
      },
    })
    .catch(() => null);

  if (!row) return null;

  await addAudit({ entityType: "certificate", entityId: id, action: "certificate.completed" as any, actorRole });

  console.log(`[CERTIFICATE COMPLETED] Certificate ${id} (${existing.type}) completed successfully`);
  return toCertificate(row);
}

export async function replaceCertificateTestResults(certificateId: string, rows: Array<{ circuitRef?: string; data: Record<string, unknown> }>): Promise<CertificateTestResult[]> {
  const client = p();
  if (!client) return [];
  await client.certificateTestResult.deleteMany({ where: { certificateId } });
  const created = await client.certificateTestResult.createMany({
    data: rows.map((r) => ({ certificateId, circuitRef: r.circuitRef ?? null, data: r.data as any })),
  });
  // createMany doesn't return rows; re-query
  const out = await client.certificateTestResult.findMany({ where: { certificateId }, orderBy: { createdAt: "asc" } });
  return out.map(toCertificateTestResult);
}

export async function getCertificateById(id: string): Promise<{ certificate: Certificate; testResults: CertificateTestResult[] } | null> {
  const client = p();
  if (!client) return null;
  const cert = await client.certificate.findUnique({ where: { id } }).catch(() => null);
  if (!cert) return null;
  const results = await client.certificateTestResult.findMany({ where: { certificateId: id }, orderBy: { createdAt: "asc" } });
  return { certificate: toCertificate(cert), testResults: results.map(toCertificateTestResult) };
}

export async function getCertificateForEngineer(id: string, engineerEmail: string): Promise<{ certificate: Certificate; testResults: CertificateTestResult[] } | null> {
  const client = p();
  if (!client) return null;
  const cert = await client.certificate.findUnique({ where: { id } }).catch(() => null);
  if (!cert || !cert.jobId) return null;
  const job = await getJobForEngineer(cert.jobId, engineerEmail);
  if (!job) return null;
  const results = await client.certificateTestResult.findMany({ where: { certificateId: id }, orderBy: { createdAt: "asc" } });
  return { certificate: toCertificate(cert), testResults: results.map(toCertificateTestResult) };
}

export async function issueCertificate(id: string): Promise<Certificate | null> {
  const client = p();
  if (!client) return null;

  const cert = await client.certificate.findUnique({ where: { id } }).catch(() => null);
  if (!cert) return null;
  if (cert.status === "void") return null;
  if (cert.status !== "completed") return null;
  const data = normalizeCertificateData(cert.type as any, cert.data ?? {});
  const ready = certificateIsReadyForCompletion(data);
  if (!ready.ok) return null;
  const results = await client.certificateTestResult.findMany({ where: { certificateId: id }, orderBy: { createdAt: "asc" } });
  const cl = cert.clientId ? await client.client.findUnique({ where: { id: cert.clientId } }).catch(() => null) : null;
  const site = cert.siteId ? await client.site.findUnique({ where: { id: cert.siteId } }).catch(() => null) : null;

  // Allocate certificate number if not already set and legal entity exists
  let certificateNumber = (cert as any).certificateNumber ?? null;
  if (!certificateNumber && (cert as any).legalEntityId) {
    certificateNumber = await allocateCertificateNumberForEntity((cert as any).legalEntityId);
  }

  // If already issued and pdfKey exists, we keep existing pdfKey but refresh issuedAt.
  const issuedAt = new Date();
  const pdf = await renderCertificatePdf({
    certificate: toCertificate({ ...cert, issuedAt, data, certificateNumber } as any),
    client: cl ? toClient(cl) : null,
    site: site ? toSite(site) : null,
    testResults: results.map(toCertificateTestResult),
  });

  const pdfKey = `certificates/${id}.pdf`;
  writeUploadBytes(pdfKey, pdf);

  const row = await client.certificate
    .update({
      where: { id },
      data: {
        status: "issued",
        issuedAt,
        pdfKey,
        ...(certificateNumber ? { certificateNumber } : {}),
      },
    })
    .catch(() => null);
  if (!row) return null;

  await addAudit({ entityType: "certificate", entityId: id, action: "certificate.issued" as any, actorRole: "admin", meta: { pdfKey } });
  return toCertificate(row);
}

export async function voidCertificate(id: string): Promise<Certificate | null> {
  const client = p();
  if (!client) return null;
  const row = await client.certificate
    .update({ where: { id }, data: { status: "void" } })
    .catch(() => null);
  if (!row) return null;
  await addAudit({ entityType: "certificate", entityId: id, action: "certificate.voided" as any, actorRole: "admin" });
  return toCertificate(row);
}

export async function reissueCertificateAsNew(id: string): Promise<Certificate | null> {
  const client = p();
  if (!client) return null;
  const existing = await client.certificate.findUnique({ where: { id } }).catch(() => null);
  if (!existing) return null;
  const results = await client.certificateTestResult.findMany({ where: { certificateId: id }, orderBy: { createdAt: "asc" } }).catch(() => [] as any[]);
  const row = await client.certificate
    .create({
      data: { jobId: existing.jobId,
        siteId: existing.siteId,
        clientId: existing.clientId,
        type: existing.type as any,
        status: "draft",
        certificateNumber: existing.certificateNumber,
        inspectorName: existing.inspectorName,
        inspectorEmail: existing.inspectorEmail,
        signedName: existing.signedName,
        dataVersion: existing.dataVersion ?? 1,
        data: normalizeCertificateData(existing.type as any, existing.data ?? {} as any) as any,
      },
    })
    .catch(() => null);
  if (!row) return null;
  if (results.length) {
    await client.certificateTestResult.createMany({
      data: results.map((r: any) => ({ certificateId: row.id, circuitRef: r.circuitRef, data: r.data })),
    });
  }
  await addAudit({ entityType: "certificate", entityId: row.id, action: "certificate.reissued" as any, actorRole: "admin", meta: { fromCertificateId: id } });
  return toCertificate(row);
}


// ------------------ Job stages ------------------

export async function listJobStages(jobId: string): Promise<JobStage[]> {
  const client = p();
  if (!client) return [];
  const rows = await client.jobStage.findMany({ where: { jobId }, orderBy: { sortOrder: "asc" } }).catch(() => [] as any[]);
  return rows.map(toJobStage);
}

export async function ensureJobStagesTemplate(jobId: string, template: "reactive" | "install" = "reactive"): Promise<JobStage[]> {
  const client = p();
  if (!client) return [];
  const existing = await client.jobStage.findFirst({ where: { jobId } }).catch(() => null);
  if (existing) return listJobStages(jobId);
  const stageNames = template === "install" ? ["First Fix", "Second Fix", "Test & Certify", "Complete"] : ["Completion"];
  const companyId = await requireCompanyIdForPrisma();
  await client.$transaction(
    stageNames.map((name, idx) =>
      client.jobStage.create({ data: { companyId, jobId, name, sortOrder: idx, status: "not_started" } })
    )
  ).catch(() => null);
  await addAudit({ entityType: "job", entityId: jobId, action: "job.stages.created" as any, actorRole: "admin", meta: { template } });
  return listJobStages(jobId);
}

export async function updateJobStage(id: string, patch: Partial<Pick<JobStage, "status">>): Promise<JobStage | null> {
  const client = p();
  if (!client) return null;
  const existing = await client.jobStage.findUnique({ where: { id } }).catch(() => null);
  if (!existing) return null;

  const nextStatus = typeof patch.status === "string" ? patch.status : undefined;
  if (!nextStatus) return toJobStage(existing);

  const now = new Date();
  const data: any = { status: nextStatus };
  if (nextStatus === "in_progress" && !existing.startedAt) data.startedAt = now;
  if (nextStatus === "done") {
    if (!existing.startedAt) data.startedAt = now;
    data.completedAt = now;
  }

  const row = await client.jobStage.update({ where: { id }, data }).catch(() => null);
  if (!row) return null;
  await addAudit({ entityType: "job", entityId: row.jobId, action: "job.stage.updated" as any, actorRole: "admin", meta: { stageId: id, status: nextStatus } });
  return toJobStage(row);
}

// ------------------ Snag items ------------------

export async function listSnagItemsForJob(jobId: string): Promise<SnagItem[]> {
  const client = p();
  if (!client) return [];
  const rows = await client.snagItem.findMany({ where: { jobId }, orderBy: { createdAt: "desc" } }).catch(() => [] as any[]);
  return rows.map(toSnagItem);
}

export async function getSnagItemById(id: string): Promise<SnagItem | null> {
  const client = p();
  if (!client) return null;
  const row = await client.snagItem.findUnique({ where: { id } }).catch(() => null);
  return row ? toSnagItem(row) : null;
}

export async function createSnagItem(input: { jobId: string; title: string; description?: string }): Promise<SnagItem | null> {
  const client = p();
  if (!client) return null;
  const companyId = await requireCompanyIdForPrisma();
  const row = await client.snagItem
    .create({
      data: {
        companyId,
        jobId: input.jobId,
        title: input.title,
        description: input.description || null,
        status: "open",
      },
    })
    .catch(() => null);
  return row ? toSnagItem(row) : null;
}

export async function updateSnagItem(
  id: string,
  patch: Partial<Pick<SnagItem, "title" | "status">> & { description?: string | null }
): Promise<SnagItem | null> {
  const client = p();
  if (!client) return null;
  const existing = await client.snagItem.findUnique({ where: { id } }).catch(() => null);
  if (!existing) return null;
  const data: any = {};
  if (typeof patch.title === "string") data.title = patch.title;
  if (typeof patch.description === "string") data.description = patch.description;
  if (patch.description === null) data.description = null;
  if (typeof patch.status === "string") {
    data.status = patch.status;
    if (patch.status === "resolved") {
      data.resolvedAt = existing.resolvedAt ?? new Date();
    } else if (existing.resolvedAt) {
      data.resolvedAt = null;
    }
  }
  const row = await client.snagItem.update({ where: { id }, data }).catch(() => null);
  return row ? toSnagItem(row) : null;
}

// ------------------ Variations ------------------

export async function listVariationsForJob(jobId: string): Promise<Variation[]> {
  const client = p();
  if (!client) return [];
  const rows = await client.variation.findMany({ where: { jobId }, orderBy: { createdAt: "desc" }, include: { stage: true } }).catch(() => [] as any[]);
  return rows.map(toVariation);
}

export async function listVariationsForQuote(quoteId: string): Promise<Variation[]> {
  const client = p();
  if (!client) return [];
  const rows = await client.variation.findMany({ where: { quoteId }, orderBy: { createdAt: "desc" }, include: { stage: true } }).catch(() => [] as any[]);
  return rows.map(toVariation);
}

export async function getVariationByToken(token: string): Promise<Variation | null> {
  const client = p();
  if (!client) return null;
  const t = String(token || "").trim();
  if (!t) return null;
  const row = await client.variation.findUnique({ where: { token: t }, include: { stage: true } }).catch(() => null);
  return row ? toVariation(row) : null;
}

export async function getVariationById(id: string): Promise<Variation | null> {
  const client = p();
  if (!client) return null;
  const row = await client.variation.findUnique({ where: { id }, include: { stage: true } }).catch(() => null);
  return row ? toVariation(row) : null;
}

export async function updateVariationDraft(input: {
  id: string;
  title?: string;
  reason?: string | null;
  notes?: string | null;
  stageId?: string | null;
  vatRate?: number;
  items?: Array<Pick<QuoteItem, "description" | "qty" | "unitPrice">>;
}): Promise<Variation | null> {
  const client = p();
  if (!client) return null;
  const existing = await client.variation.findUnique({ where: { id: input.id } }).catch(() => null);
  if (!existing) return null;
  // Only allow edits while draft (and before client decision)
  if (existing.status !== "draft") return toVariation(existing);

  const vatRate = typeof input.vatRate === "number" ? input.vatRate : existing.vatRate;
  let stageId = typeof input.stageId === "string" ? input.stageId.trim() : input.stageId === null ? null : existing.stageId;
  if (!existing.jobId) stageId = null;
  if (stageId) {
    const stage = await client.jobStage.findFirst({ where: { id: stageId, jobId: existing.jobId ?? undefined } }).catch(() => null);
    if (!stage) stageId = null;
  }
  const items: QuoteItem[] = Array.isArray(input.items)
    ? (input.items ?? []).map((it) => ({
        id: crypto.randomUUID(),
        description: String(it.description ?? "").trim(),
        qty: Number(it.qty ?? 1),
        unitPrice: Number(it.unitPrice ?? 0),
      }))
    : (existing.items as any);

  const totals = fileDb.quoteTotals({ id: "_", token: "_", clientName: "_", clientEmail: "_", vatRate, items, status: "draft", createdAtISO: new Date().toISOString(), updatedAtISO: new Date().toISOString() } as any);

  const row = await client.variation
    .update({
      where: { id: input.id },
      data: {
        title: typeof input.title === "string" ? input.title.trim() : existing.title,
        reason: typeof input.reason === "string" ? input.reason.trim() : input.reason === null ? null : existing.reason,
        notes: typeof input.notes === "string" ? input.notes.trim() : input.notes === null ? null : existing.notes,
        stageId,
        vatRate,
        items,
        subtotal: totals.subtotal,
        vat: totals.vat,
        total: totals.total,
      },
      include: { stage: true },
    })
    .catch(() => null);
  if (!row) return null;
  await addAudit({ entityType: "job", entityId: row.jobId ?? "", action: "variation.updated" as any, actorRole: "admin", meta: { variationId: row.id } });
  return toVariation(row);
}

export async function createVariationForJob(input: {
  jobId: string;
  title: string;
  reason?: string;
  notes?: string;
  stageId?: string;
  actorRole?: Role;
  actor?: string;
  vatRate?: number;
  items: Array<Pick<QuoteItem, "description" | "qty" | "unitPrice">>;
}): Promise<Variation | null> {
  const client = p();
  if (!client) return null;
  const job = await client.job.findUnique({ where: { id: input.jobId } }).catch(() => null);
  if (!job) return null;

  const token = crypto.randomBytes(24).toString("hex");
  const vatRate = typeof input.vatRate === "number" ? input.vatRate : 0.2;
  const items: QuoteItem[] = (input.items ?? []).map((it) => ({
    id: crypto.randomUUID(),
    description: String(it.description ?? "").trim(),
    qty: Number(it.qty ?? 1),
    unitPrice: Number(it.unitPrice ?? 0),
  }));
  const totals = fileDb.quoteTotals({ id: "_", token: "_", clientName: "_", clientEmail: "_", vatRate, items, status: "draft", createdAtISO: new Date().toISOString(), updatedAtISO: new Date().toISOString() } as any);
  let stageId = String(input.stageId || "").trim() || null;
  if (stageId) {
    const stage = await client.jobStage.findFirst({ where: { id: stageId, jobId: input.jobId } }).catch(() => null);
    if (!stage) stageId = null;
  }

  const row = await client.variation
    .create({
      data: {
        companyId: await requireCompanyIdForPrisma(),
        token,
        jobId: input.jobId,
        quoteId: job.quoteId ?? null,
        stageId,
        title: input.title.trim(),
        reason: input.reason?.trim() || null,
        notes: input.notes?.trim() || null,
        status: "draft",
        vatRate,
        items,
        subtotal: totals.subtotal,
        vat: totals.vat,
        total: totals.total,
      },
      include: { stage: true },
    })
    .catch(() => null);
  if (!row) return null;
  await addAudit({ entityType: "job", entityId: input.jobId, action: "variation.created" as any, actorRole: input.actorRole ?? "admin", actor: input.actor, meta: { variationId: row.id } });
  return toVariation(row);
}

export async function sendVariation(id: string): Promise<Variation | null> {
  const client = p();
  if (!client) return null;
  const existing = await client.variation.findUnique({ where: { id }, include: { stage: true } }).catch(() => null);
  if (!existing) return null;
  if (existing.status !== "draft") return toVariation(existing);
  const row = await client.variation.update({ where: { id }, data: { status: "sent", sentAt: existing.sentAt ?? new Date() }, include: { stage: true } }).catch(() => null);
  if (!row) return null;
  await addAudit({ entityType: "job", entityId: row.jobId ?? "", action: "variation.sent" as any, actorRole: "admin", meta: { variationId: id } });
  return toVariation(row);
}

export async function decideVariationByToken(token: string, decision: "approved" | "rejected"): Promise<Variation | null> {
  const client = p();
  if (!client) return null;

  // Fetch variation with job data for approver resolution
  const v = await client.variation.findUnique({
    where: { token },
    include: { stage: true, job: { include: { client: true, quote: true } } }
  }).catch(() => null);

  if (!v) return null;

  // IDEMPOTENCY: If already decided, return existing state without modifying budget
  if (v.status === "approved" || v.status === "rejected") {
    console.log(`[IDEMPOTENT] Variation ${v.id} already ${v.status} - no action taken`);
    return toVariation(v);
  }

  // Resolve approver email
  const job = (v as any).job;
  const approver = job?.client?.email ?? job?.quote?.clientEmail ?? "client";

  const approvedAt = decision === "approved" ? new Date() : null;
  const rejectedAt = decision === "rejected" ? new Date() : null;

  // CRITICAL: Use transaction to atomically update variation status AND job budget
  // This prevents race conditions where two approvals could both increment the budget
  try {
    const result = await client.$transaction(async (tx: any) => {
      // Re-check status inside transaction to prevent race condition
      const current = await tx.variation.findUnique({ where: { id: v.id }, select: { status: true, jobId: true, subtotal: true, vat: true, total: true } });

      if (!current) {
        throw new Error("Variation not found");
      }

      // IDEMPOTENCY GUARD: Only proceed if status is still "draft"
      if (current.status !== "draft") {
        console.log(`[RACE CONDITION PREVENTED] Variation ${v.id} status changed to ${current.status} during processing`);
        return null;
      }

      // Update variation status atomically
      const updatedVariation = await tx.variation.update({
        where: { id: v.id },
        data: {
          status: decision,
          approvedAt,
          rejectedAt,
          approvedBy: decision === "approved" ? approver : null,
        },
        include: { stage: true },
      });

      // REVENUE IMPACT: Only increment budget if approved AND has jobId
      // Rejections have ZERO financial impact
      if (decision === "approved" && current.jobId) {
        const subtotalIncrement = Number(current.subtotal ?? 0);
        const vatIncrement = Number(current.vat ?? 0);
        const totalIncrement = Number(current.total ?? 0);

        // INVARIANT: Log budget increment for audit trail
        console.log(`[BUDGET INCREMENT] Job ${current.jobId}: +${subtotalIncrement} subtotal, +${vatIncrement} VAT, +${totalIncrement} total (variation ${v.id})`);

        await tx.job.update({
          where: { id: current.jobId },
          data: {
            budgetSubtotal: { increment: subtotalIncrement },
            budgetVat: { increment: vatIncrement },
            budgetTotal: { increment: totalIncrement },
          },
        });
      }

      return updatedVariation;
    });

    // Transaction rolled back (likely due to race condition)
    if (!result) {
      // Re-fetch current state and return it
      const current = await client.variation.findUnique({ where: { id: v.id }, include: { stage: true } });
      return current ? toVariation(current) : null;
    }

    // Add audit log after successful transaction
    if (decision === "approved" && result.jobId) {
      await addAudit({
        entityType: "job",
        entityId: result.jobId,
        action: "variation.approved" as any,
        actorRole: "client",
        meta: { variationId: result.id }
      });
    } else if (result.jobId) {
      await addAudit({
        entityType: "job",
        entityId: result.jobId,
        action: "variation.rejected" as any,
        actorRole: "client",
        meta: { variationId: result.id }
      });
    }

    return toVariation(result);

  } catch (err) {
    console.error(`[ERROR] Failed to decide variation ${v.id}:`, err);
    return null;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Enquiries (Pipeline Management)
// ────────────────────────────────────────────────────────────────────────────

export async function listEnquiries(opts?: { stageId?: string }): Promise<any[]> {
  const companyId = await getCompanyId();
  const client = p();
  if (!client) return [];

  // Security assertion: companyId must exist for multi-tenant isolation
  if (!companyId) {
    console.error("[SECURITY] listEnquiries called without companyId - potential data leak");
    throw new Error("Company ID required for data access");
  }

  const where: any = { companyId };
  if (opts?.stageId) where.stageId = opts.stageId;

  const rows = await client.enquiry.findMany({
    where,
    include: { stage: true, owner: true, events: { orderBy: { createdAt: "desc" }, take: 5 } },
    orderBy: { createdAt: "desc" },
  }).catch(() => []);

  return rows.map((e: any) => ({
    id: e.id,
    companyId: e.companyId,
    stageId: e.stageId,
    ownerId: e.ownerId,
    ownerName: e.owner?.name,
    ownerEmail: e.owner?.email,
    stageName: e.stage.name,
    stageColor: e.stage.color,
    name: e.name,
    email: e.email,
    phone: e.phone,
    notes: e.notes,
    valueEstimate: e.valueEstimate,
    quoteId: e.quoteId,
    events: e.events.map((ev: any) => ({ id: ev.id, type: ev.type, note: ev.note, createdAt: ev.createdAt.toISOString() })),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));
}

export async function getEnquiryById(id: string): Promise<any | null> {
  const companyId = await getCompanyId();
  const client = p();
  if (!client) return null;

  // Security assertion: companyId must exist for multi-tenant isolation
  if (!companyId) {
    console.error("[SECURITY] getEnquiryById called without companyId - potential data leak");
    throw new Error("Company ID required for data access");
  }

  const e = await client.enquiry.findUnique({
    where: { id, companyId },
    include: { stage: true, owner: true, events: { orderBy: { createdAt: "desc" } } },
  }).catch(() => null);

  if (!e) return null;

  return {
    id: e.id,
    companyId: e.companyId,
    stageId: e.stageId,
    ownerId: e.ownerId,
    ownerName: e.owner?.name,
    ownerEmail: e.owner?.email,
    stageName: e.stage.name,
    stageColor: e.stage.color,
    name: e.name,
    email: e.email,
    phone: e.phone,
    notes: e.notes,
    valueEstimate: e.valueEstimate,
    quoteId: e.quoteId,
    events: e.events.map((ev: any) => ({ id: ev.id, type: ev.type, note: ev.note, createdAt: ev.createdAt.toISOString() })),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export async function createEnquiry(data: { stageId: string; ownerId?: string; name?: string; email?: string; phone?: string; notes?: string; valueEstimate?: number }): Promise<any | null> {
  const companyId = await getCompanyId();
  const client = p();
  if (!client) return null;

  // Security assertion: companyId must exist for multi-tenant isolation
  if (!companyId) {
    console.error("[SECURITY] createEnquiry called without companyId - potential data leak");
    throw new Error("Company ID required for data creation");
  }

  const e = await client.enquiry.create({
    data: {
      companyId,
      stageId: data.stageId,
      ownerId: data.ownerId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      notes: data.notes,
      valueEstimate: data.valueEstimate,
    },
    include: { stage: true, owner: true },
  }).catch(() => null);

  if (!e) return null;

  // Add creation event
  await client.enquiryEvent.create({
    data: {
      companyId,
      enquiryId: e.id,
      type: "created",
      note: "Enquiry created",
    },
  }).catch(() => null);

  return {
    id: e.id,
    companyId: e.companyId,
    stageId: e.stageId,
    ownerId: e.ownerId,
    ownerName: e.owner?.name,
    ownerEmail: e.owner?.email,
    stageName: e.stage.name,
    stageColor: e.stage.color,
    name: e.name,
    email: e.email,
    phone: e.phone,
    notes: e.notes,
    valueEstimate: e.valueEstimate,
    quoteId: e.quoteId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export async function updateEnquiry(id: string, data: { stageId?: string; ownerId?: string; name?: string; email?: string; phone?: string; notes?: string; valueEstimate?: number; quoteId?: string }): Promise<any | null> {
  const companyId = await getCompanyId();
  const client = p();
  if (!client) return null;

  // Security assertion: companyId must exist for multi-tenant isolation
  if (!companyId) {
    console.error("[SECURITY] updateEnquiry called without companyId - potential unauthorized modification");
    throw new Error("Company ID required for data modification");
  }

  const updateData: any = {};
  if (data.stageId !== undefined) updateData.stageId = data.stageId;
  if (data.ownerId !== undefined) updateData.ownerId = data.ownerId;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.valueEstimate !== undefined) updateData.valueEstimate = data.valueEstimate;
  if (data.quoteId !== undefined) updateData.quoteId = data.quoteId;

  const e = await client.enquiry.update({
    where: { id, companyId },
    data: updateData,
    include: { stage: true, owner: true },
  }).catch(() => null);

  if (!e) return null;

  // Add update event if stage changed
  if (data.stageId) {
    await client.enquiryEvent.create({
      data: {
        companyId,
        enquiryId: e.id,
        type: "stage_changed",
        note: `Moved to ${e.stage.name}`,
      },
    }).catch(() => null);
  }

  // Add event if owner changed
  if (data.ownerId !== undefined) {
    const ownerNote = e.owner ? `Assigned to ${e.owner.name || e.owner.email}` : "Owner removed";
    await client.enquiryEvent.create({
      data: {
        companyId,
        enquiryId: e.id,
        type: "owner_changed",
        note: ownerNote,
      },
    }).catch(() => null);
  }

  return {
    id: e.id,
    companyId: e.companyId,
    stageId: e.stageId,
    ownerId: e.ownerId,
    ownerName: e.owner?.name,
    ownerEmail: e.owner?.email,
    stageName: e.stage.name,
    stageColor: e.stage.color,
    name: e.name,
    email: e.email,
    phone: e.phone,
    notes: e.notes,
    valueEstimate: e.valueEstimate,
    quoteId: e.quoteId,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export async function deleteEnquiry(id: string): Promise<boolean> {
  const companyId = await getCompanyId();
  const client = p();
  if (!client) return false;

  // Security assertion: companyId must exist for multi-tenant isolation
  if (!companyId) {
    console.error("[SECURITY] deleteEnquiry called without companyId - potential unauthorized deletion");
    throw new Error("Company ID required for data deletion");
  }

  const deleted = await client.enquiry.delete({
    where: { id, companyId },
  }).catch(() => null);

  return !!deleted;
}

export async function addEnquiryEvent(enquiryId: string, type: string, note?: string): Promise<any | null> {
  const companyId = await getCompanyId();
  const client = p();
  if (!client) return null;

  // Security assertion: companyId must exist for multi-tenant isolation
  if (!companyId) {
    console.error("[SECURITY] addEnquiryEvent called without companyId - potential unauthorized access");
    throw new Error("Company ID required for event creation");
  }

  const event = await client.enquiryEvent.create({
    data: {
      companyId,
      enquiryId,
      type,
      note,
    },
  }).catch(() => null);

  if (!event) return null;

  return {
    id: event.id,
    type: event.type,
    note: event.note,
    createdAt: event.createdAt.toISOString(),
  };
}

export async function listPipelineStages(): Promise<any[]> {
  const companyId = await getCompanyId();
  const client = p();
  if (!client) return [];

  // Security assertion: companyId must exist for multi-tenant isolation
  if (!companyId) {
    console.error("[SECURITY] listPipelineStages called without companyId - potential data leak");
    throw new Error("Company ID required for data access");
  }

  const stages = await client.pipelineStage.findMany({
    where: { companyId },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { enquiries: true } } },
  }).catch(() => []);

  return stages.map((s: any) => ({
    id: s.id,
    name: s.name,
    sortOrder: s.sortOrder,
    color: s.color,
    isWon: s.isWon,
    isLost: s.isLost,
    enquiryCount: s._count.enquiries,
  }));
}

export async function ensureDefaultPipelineStages(): Promise<void> {
  const companyId = await getCompanyId();
  const client = p();
  if (!client) return;

  // Security assertion: companyId must exist for multi-tenant isolation
  if (!companyId) {
    console.error("[SECURITY] ensureDefaultPipelineStages called without companyId - potential data creation for wrong company");
    throw new Error("Company ID required for data creation");
  }

  const existing = await client.pipelineStage.count({ where: { companyId } });
  if (existing > 0) return;

  // Create default stages
  await client.pipelineStage.createMany({
    data: [
      { companyId, name: "New", sortOrder: 0, color: "#3b82f6" },
      { companyId, name: "Contacted", sortOrder: 1, color: "#8b5cf6" },
      { companyId, name: "Quoting", sortOrder: 2, color: "#f59e0b" },
      { companyId, name: "Won", sortOrder: 3, color: "#10b981", isWon: true },
      { companyId, name: "Lost", sortOrder: 4, color: "#ef4444", isLost: true },
    ],
  }).catch(() => null);
}
