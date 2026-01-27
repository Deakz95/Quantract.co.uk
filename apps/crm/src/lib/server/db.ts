import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Role } from "@/lib/serverAuth";
import type { CertificateData, CertificateType } from "@/lib/certificates";
export type { CertificateType } from "@/lib/certificates";

import { clampMoney } from "@/lib/invoiceMath";

export type QuoteItem = {
  id: string;
  description: string;
  qty: number;
  unitPrice: number; // pounds
};

export type QuoteStatus = "draft" | "sent" | "accepted";

export type AgreementStatus = "draft" | "signed";

export type Quote = {
  id: string;
  token: string; // share token for client link
  invoiceNumber?: string;
  companyId?: string;
  clientId?: string;
  siteId?: string;
  version?: number;
  clientName: string;
  clientEmail: string;
  siteAddress?: string;
  notes?: string;
  vatRate: number; // e.g. 0.2
  items: QuoteItem[];
  status: QuoteStatus;
  createdAtISO: string;
  updatedAtISO: string;
  acceptedAtISO?: string;
};

export type QuoteRevision = {
  id: string;
  quoteId: string;
  version: number;
  snapshot: Quote;
  createdAtISO: string;
};

export type Site = {
  id: string;
  clientId: string;
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  notes?: string;
  paymentTermsDays?: number;
  disableAutoChase?: boolean;
  xeroContactId?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

export type Agreement = {
  id: string;
  token: string;
  clientId?: string; // ✅ add
  quoteId: string;
  status: AgreementStatus;
  templateVersion: string;
  quoteSnapshot: Quote;
  createdAtISO: string;
  updatedAtISO: string;
  signedAtISO?: string;
  signerName?: string;
  signerEmail?: string;
  signerIp?: string;
  signerUserAgent?: string;
  certificateHash?: string;
};


export type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  notes?: string;
  paymentTermsDays?: number;
  disableAutoChase?: boolean;
  xeroContactId?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

// ---------------- v2 domain types (Prisma-backed in production) ----------------

export type InvoiceStatus = "draft" | "sent" | "unpaid" | "paid";

export type InvoiceType = "deposit" | "stage" | "variation" | "final";

export type Invoice = {
  id: string;
  token: string; // share token for client link
  invoiceNumber?: string;
  companyId?: string;
  legalEntityId?: string;
  clientId?: string;
  quoteId?: string;
  jobId?: string;
  variationId?: string;
  type?: InvoiceType;
  stageName?: string;
  clientName: string;
  clientEmail: string;
  subtotal: number; // ex VAT
  vat: number; // VAT amount
  total: number; // subtotal + vat
  status: InvoiceStatus;
  createdAtISO: string;
  updatedAtISO: string;
  paidAtISO?: string;
  sentAtISO?: string;
  dueAtISO?: string;
  xeroInvoiceId?: string;
  xeroSyncStatus?: string;
  xeroLastSyncAtISO?: string;
  xeroLastError?: string;
  paymentProvider?: "stripe" | "demo";
  paymentUrl?: string;
  paymentRef?: string; // checkout session / intent / etc.
};

export type InvoicePayment = {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  provider: "stripe" | "manual";
  status: "pending" | "succeeded" | "failed";
  providerRef?: string;
  receivedAtISO: string;
};

export type InvoiceAttachment = {
  id: string;
  invoiceId: string;
  name: string;
  fileKey: string;
  mimeType: string;
  createdAtISO: string;
};

export type SupplierBill = {
  id: string;
  jobId: string;
  supplier: string;
  reference?: string;
  billDateISO?: string;
  status?: string;
  postedAtISO?: string;
  subtotal: number;
  vat: number;
  total: number;
  pdfKey?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

export type SupplierBillLine = {
  id: string;
  billId: string;
  description: string;
  quantity: number;
  unitCost: number;
  vatRate: number;
  totalExVat: number;
  costItemId?: string;
  createdAtISO: string;
};

export type JobStatus = "new" | "scheduled" | "in_progress" | "completed";

export type JobStageStatus = "not_started" | "in_progress" | "done";

export type JobStage = {
  id: string;
  jobId: string;
  name: string;
  status: JobStageStatus;
  sortOrder: number;
  startedAtISO?: string;
  completedAtISO?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

export type SnagItemStatus = "open" | "in_progress" | "resolved";

export type SnagItem = {
  id: string;
  jobId: string;
  title: string;
  description?: string;
  status: SnagItemStatus;
  resolvedAtISO?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

export type Job = {
  id: string;
  quoteId: string;
  invoiceId?: string;
  clientName: string;
  clientEmail: string;
  client?: Client;
  siteAddress?: string;
  status: JobStatus;
  engineerEmail?: string;
  scheduledAtISO?: string;
  notes?: string;
  clientId?: string;
  siteId?: string;
  siteName?: string;
  title?: string;
  serviceLineId?: string;
  performingLegalEntityId?: string;
  // Budget snapshot (ex VAT)
  budgetSubtotal?: number;
  budgetVat?: number;
  budgetTotal?: number;
  createdAtISO: string;
  updatedAtISO: string;
};

export type ScheduleEntry = {
  id: string;
  jobId: string;
  engineerId: string;
  engineerEmail?: string;
  startAtISO: string;
  endAtISO: string;
  notes?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

export type VariationStatus = "draft" | "sent" | "approved" | "rejected";

export type Variation = {
  id: string;
  token?: string;
  quoteId?: string;
  jobId?: string;
  stageId?: string;
  stageName?: string;
  title: string;
  reason?: string;
  notes?: string;
  status: VariationStatus;
  vatRate: number;
  items: QuoteItem[];
  subtotal: number;
  vat: number;
  total: number;
  createdAtISO: string;
  updatedAtISO: string;
  sentAtISO?: string;
  approvedAtISO?: string;
  rejectedAtISO?: string;
  approvedBy?: string;
};

export type VariationAttachment = {
  id: string;
  variationId: string;
  name: string;
  mimeType: string;
  fileKey?: string;
  createdAtISO: string;
};

export type TimeEntry = {
  id: string;
  jobId: string;
  engineerId: string;
  engineerEmail?: string;
  timesheetId?: string;
  startedAtISO: string;
  endedAtISO?: string;
  breakMinutes: number;
  notes?: string;
  status?: "draft" | "submitted" | "approved" | "rejected";
  lockedAtISO?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

export type Timesheet = {
  id: string;
  engineerId: string;
  engineerEmail?: string;
  weekStartISO: string; // Monday 00:00 local
  status: TimesheetStatus;
  submittedAtISO?: string;
  approvedAtISO?: string;
  approvedBy?: string;
  notes?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

export type CostItemType = "material" | "subcontractor" | "plant" | "other" | "labour";

export type CostItem = {
  id: string;
  jobId: string;
  type: CostItemType;
  stageId?: string;
  source?: string;
  lockStatus?: string;
  supplier?: string;
  description: string;
  quantity: number;
  unitCost: number;
  markupPct: number;
  incurredAtISO?: string;
  totalCost: number;
  attachments?: CostItemAttachment[];
  createdAtISO: string;
  updatedAtISO: string;
};

export type CostItemAttachment = {
  id: string;
  costItemId: string;
  name: string;
  mimeType: string;
  createdAtISO: string;
};

export type CertificateStatus = "draft" | "completed" | "issued" | "void";

export type Certificate = {
  id: string;
  jobId?: string;
  siteId?: string;
  clientId?: string;
  legalEntityId?: string;
  type: CertificateType;
  status: CertificateStatus;
  certificateNumber?: string;
  issuedAtISO?: string;
  inspectorName?: string;
  inspectorEmail?: string;
  dataVersion: number;
  data: CertificateData;
  completedAtISO?: string;
  pdfKey?: string;
  signedName?: string;
  signedAtISO?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

export type CertificateTestResult = {
  id: string;
  certificateId: string;
  circuitRef?: string;
  data: Record<string, unknown>;
  createdAtISO: string;
  updatedAtISO: string;
};

export type JobCostingSummary = {
  jobId: string;
  budgetSubtotal: number;
  actualCost: number;
  forecastCost: number;
  actualMargin: number;
  forecastMargin: number;
  actualMarginPct: number;
  forecastMarginPct: number;
};

export type Engineer = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  costRatePerHour?: number;
  chargeRatePerHour?: number;
  rateCardId?: string;
  rateCardName?: string;
  rateCardCostRate?: number;
  rateCardChargeRate?: number;
  isActive?: boolean;
  createdAtISO: string;
  updatedAtISO: string;
};

export type RateCard = {
  id: string;
  name: string;
  costRatePerHour: number;
  chargeRatePerHour: number;
  isDefault?: boolean;
  createdAtISO: string;
  updatedAtISO: string;
};

export type JobBudgetLine = {
  id: string;
  jobId: string;
  source: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sortOrder: number;
  createdAtISO: string;
  updatedAtISO: string;
};


export type AuditEvent = {
  id: string;
  entityType: "quote" | "agreement" | "invoice" | "job" | "certificate" | "variation" | "enquiry" | "client" | "site" | "stage" | "contact" | "deal" | "activity" | "deal_stage";
  entityId: string;
  action:
    | "quote.created"
    | "quote.sent"
    | "quote.accepted"
    | "quote.viewed"
    | "agreement.created"
    | "agreement.viewed"
    | "agreement.signed"
    | "email.sent"
    | "email.failed"
    | "token.rotated"
    | "invoice.created"
    | "invoice.sent"
    | "invoice.unpaid"
    | "invoice.paid"
    | "invoice.viewed"
    | "payment.link.created"
    | "job.created"
    | "job.assigned"
    | "job.status.changed"
    | "certificate.created"
    | "certificate.completed"
    | "certificate.issued"
    | "certificate.voided"
    | "variation.viewed"
    | "enquiry.created"
    | "enquiry.updated"
    | "enquiry.deleted"
    | "client.created"
    | "client.updated"
    | "client.deleted"
    | "site.created"
    | "site.updated"
    | "site.deleted"
    | "stage.created"
    | "stage.updated"
    | "stage.deleted"
    | "contact.created"
    | "contact.updated"
    | "contact.deleted"
    | "deal.created"
    | "deal.updated"
    | "deal.deleted"
    | "deal.stage_changed"
    | "activity.created"
    | "activity.updated"
    | "activity.deleted"
    | "deal_stage.created"
    | "deal_stage.updated"
    | "deal_stage.deleted"
    | "deal_stage.reordered";
  actorRole: Role | "system";
  actor?: string; // email / name if available
  meta?: Record<string, unknown>;
  createdAtISO: string;
};

type DbShape = {
  clients: Client[];
  quotes: Quote[];
  agreements: Agreement[];
  invoices: Invoice[];
  jobs: Job[];
  scheduleEntries: ScheduleEntry[];
  audit: AuditEvent[];
};

const DEFAULT_DB: DbShape = { clients: [], quotes: [], agreements: [], invoices: [], jobs: [], scheduleEntries: [], audit: [] };

function dataPath() {
  return process.env.QT_DATA_PATH || path.join(process.cwd(), ".qt-data.json");
}

function readDb(): DbShape {
  const p = dataPath();
  try {
    if (!fs.existsSync(p)) return DEFAULT_DB;
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw) as DbShape;
    return {
      clients: Array.isArray((parsed as any).clients) ? (parsed as any).clients : [],
      quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
      agreements: Array.isArray((parsed as any).agreements) ? (parsed as any).agreements : [],
      invoices: Array.isArray((parsed as any).invoices) ? (parsed as any).invoices : [],
      jobs: Array.isArray((parsed as any).jobs) ? (parsed as any).jobs : [],
      scheduleEntries: Array.isArray((parsed as any).scheduleEntries) ? (parsed as any).scheduleEntries : [],
      audit: Array.isArray((parsed as any).audit) ? (parsed as any).audit : [],
    };
  } catch {
    return DEFAULT_DB;
  }
}

function writeDb(db: DbShape) {
  const p = dataPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(db, null, 2), "utf-8");
}

export function quoteTotals(q: Quote) {
  const subtotal = clampMoney(q.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0));
  const vat = clampMoney(subtotal * q.vatRate);
  const total = clampMoney(subtotal + vat);
  return { subtotal, vat, total };
}


export function listClients(): Client[] {
  return readDb().clients.sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));
}

export function getClientById(id: string): Client | null {
  return readDb().clients.find((c) => c.id === id) ?? null;
}

export function getClientByEmail(email: string): Client | null {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;
  return readDb().clients.find((c) => (c.email || "").trim().toLowerCase() === e) ?? null;
}

export function createClient(input: {
  name: string;
  email: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
  notes?: string;
}): Client {
  const db = readDb();
  const now = new Date().toISOString();
  const c: Client = {
    id: crypto.randomUUID(),
    name: String(input.name ?? "").trim(),
    email: String(input.email ?? "").trim().toLowerCase(),
    phone: input.phone?.trim() || undefined,
    address1: input.address1?.trim() || undefined,
    address2: input.address2?.trim() || undefined,
    city: input.city?.trim() || undefined,
    county: input.county?.trim() || undefined,
    postcode: input.postcode?.trim() || undefined,
    country: input.country?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAtISO: now,
    updatedAtISO: now,
  };
  db.clients.push(c);
  writeDb(db);
  return c;
}

export function updateClient(id: string, patch: Partial<Omit<Client, "id" | "createdAtISO">>): Client | null {
  const db = readDb();
  const idx = db.clients.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const prev = db.clients[idx];
  const next: Client = {
    ...prev,
    ...patch,
    email: patch.email ? String(patch.email).trim().toLowerCase() : prev.email,
    name: patch.name ? String(patch.name).trim() : prev.name,
    updatedAtISO: new Date().toISOString(),
  };
  db.clients[idx] = next;
  writeDb(db);
  return next;
}

export function deleteClient(id: string): boolean {
  const db = readDb();
  const before = db.clients.length;
  db.clients = db.clients.filter((c) => c.id !== id);
  if (db.clients.length === before) return false;
  writeDb(db);
  return true;
}

export function clientDisplayAddress(c: Client): string {
  const parts = [c.address1, c.address2, c.city, c.county, c.postcode, c.country].filter(Boolean);
  return parts.join(", ");
}

export function listQuotesForClient(params: { clientId?: string; email?: string }): Quote[] {
  const db = readDb();
  const cid = params.clientId || "";
  const e = String(params.email || "").trim().toLowerCase();
  return db.quotes
    .filter((q) => (cid && (q as any).clientId === cid) || (e && (q.clientEmail || "").trim().toLowerCase() === e))
    .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));
}

export function listInvoicesForClient(params: { clientId?: string; email?: string }): Invoice[] {
  const db = readDb();
  const cid = params.clientId || "";
  const e = String(params.email || "").trim().toLowerCase();
  return db.invoices
    .filter((i) => (cid && (i as any).clientId === cid) || (e && (i.clientEmail || "").trim().toLowerCase() === e))
    .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));
}

export function listAgreementsForQuoteIds(quoteIds: string[]): Agreement[] {
  const set = new Set(quoteIds);
  return readDb().agreements.filter((a) => set.has(a.quoteId));
}


export function listQuotes(): Quote[] {
  return readDb().quotes.sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));
}


export function listInvoices(): Invoice[] {
  return readDb().invoices.sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));
}

export function listInvoicesForClientEmail(email: string): Invoice[] {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return [];
  return readDb()
    .invoices
    .filter((i) => (i.clientEmail || "").trim().toLowerCase() === e)
    .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));
}

export function getInvoiceById(id: string): Invoice | null {
  return readDb().invoices.find((i) => i.id === id) ?? null;
}

export function getInvoiceByToken(token: string): Invoice | null {
  return readDb().invoices.find((i) => i.token === token) ?? null;
}

export function createInvoice(input: {
  quoteId?: string;
  clientId?: string;
  clientName: string;
  clientEmail: string;
  subtotal: number;
  vat: number;
  total: number;
}): Invoice {
  const db = readDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString("hex");

  const client = input.clientId ? db.clients.find((c) => c.id === input.clientId) : null;

  const resolvedName =
    String(input.clientName ?? "").trim() ||
    (client?.name ? String(client.name).trim() : "") ||
    "Client";

  const resolvedEmail =
    String(input.clientEmail ?? "").trim().toLowerCase() ||
    (client?.email ? String(client.email).trim().toLowerCase() : "") ||
    "";

  const inv: Invoice = {
    id,
    token,
    clientId: input.clientId || undefined,
    quoteId: input.quoteId || undefined,
    clientName: resolvedName,
    clientEmail: resolvedEmail,
    subtotal: Number(input.subtotal ?? 0),
    vat: Number(input.vat ?? 0),
    total: Number(input.total ?? 0),
    status: "draft",
    createdAtISO: now,
    updatedAtISO: now,
  };

  db.invoices.push(inv);
  writeDb(db);

  addAudit({
    entityType: "invoice",
    entityId: inv.id,
    action: "invoice.created",
    actorRole: "admin",
    meta: { clientEmail: inv.clientEmail, quoteId: inv.quoteId },
  });

  return inv;
}

export function updateInvoice(id: string, patch: Partial<Omit<Invoice, "id" | "token" | "createdAtISO">>): Invoice | null {
  const db = readDb();
  const idx = db.invoices.findIndex((i) => i.id === id);
  if (idx === -1) return null;

  const existing = db.invoices[idx];
  const next: Invoice = {
    ...existing,
    ...patch,
    token: existing.token,
    id: existing.id,
    createdAtISO: existing.createdAtISO,
    updatedAtISO: new Date().toISOString(),
  };

  db.invoices[idx] = next;
  writeDb(db);

  if (patch.status === "sent") {
    addAudit({ entityType: "invoice", entityId: id, action: "invoice.sent", actorRole: "admin" });
  }
  if (patch.status === "unpaid") {
    addAudit({ entityType: "invoice", entityId: id, action: "invoice.unpaid", actorRole: "admin" });
  }
  if (patch.status === "paid") {
    addAudit({ entityType: "invoice", entityId: id, action: "invoice.paid", actorRole: "admin" });
  }

  return next;
}

export function createPaymentLinkForInvoice(id: string): Invoice | null {
  const inv = getInvoiceById(id);
  if (!inv) return null;
  const ref = crypto.randomBytes(8).toString("hex");
  const paymentUrl = `/client/invoices/${inv.token}?pay=1&ref=${ref}`;
  const next = updateInvoice(id, {
    paymentProvider: "demo",
    paymentUrl,
    paymentRef: ref,
    status: inv.status === "draft" ? "unpaid" : inv.status,
  });
  if (next) {
    addAudit({ entityType: "invoice", entityId: id, action: "payment.link.created", actorRole: "admin", meta: { paymentUrl } });
  }
  return next;
}

export function markInvoicePaidByToken(token: string): Invoice | null {
  const inv = getInvoiceByToken(token);
  if (!inv) return null;
  if (inv.status === "paid") return inv;
  return updateInvoice(inv.id, { status: "paid", paidAtISO: new Date().toISOString() });
}

export function listJobs(): Job[] {
  return readDb().jobs.sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));
}

export function listJobsForEngineer(email: string): Job[] {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return [];
  return readDb().jobs.filter((j) => (j.engineerEmail || "").trim().toLowerCase() === e)
    .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));
}

export function getJobById(id: string): Job | null {
  return readDb().jobs.find((j) => j.id === id) ?? null;
}

export function ensureJobForQuote(quoteId: string): Job | null {
  const q = getQuoteById(quoteId);
  if (!q) return null;
  const db = readDb();
  const existing = db.jobs.find((j) => j.quoteId === quoteId);
  if (existing) return existing;

  const now = new Date().toISOString();
  const inv = db.invoices.find((i) => i.quoteId === quoteId);
  const job: Job = {
    id: `JOB-${Math.floor(10000 + Math.random() * 90000)}`,
    quoteId,
    invoiceId: inv?.id,
    clientName: q.clientName,
    clientEmail: q.clientEmail,
    siteAddress: q.siteAddress,
    status: "new",
    createdAtISO: now,
    updatedAtISO: now,
  };

  db.jobs.push(job);
  writeDb(db);
  addAudit({ entityType: "job", entityId: job.id, action: "job.created", actorRole: "system", meta: { quoteId } });
  return job;
}

export function updateJob(id: string, patch: Partial<Omit<Job, "id" | "createdAtISO" | "quoteId">>): Job | null {
  const db = readDb();
  const idx = db.jobs.findIndex((j) => j.id === id);
  if (idx === -1) return null;
  const existing = db.jobs[idx];
  const next: Job = {
    ...existing,
    ...patch,
    id: existing.id,
    quoteId: existing.quoteId,
    createdAtISO: existing.createdAtISO,
    updatedAtISO: new Date().toISOString(),
  };
  db.jobs[idx] = next;
  writeDb(db);

  if (patch.engineerEmail) {
    addAudit({ entityType: "job", entityId: id, action: "job.assigned", actorRole: "admin", meta: { engineerEmail: patch.engineerEmail } });
  }
  if (patch.status) {
    addAudit({ entityType: "job", entityId: id, action: "job.status.changed", actorRole: "admin", meta: { status: patch.status } });
  }
  return next;
}

export function listScheduleEntries(fromISO: string, toISO: string): ScheduleEntry[] {
  const from = new Date(fromISO).getTime();
  const to = new Date(toISO).getTime();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return [];
  return readDb().scheduleEntries
    .filter((e) => {
      const s = new Date(e.startAtISO).getTime();
      const en = new Date(e.endAtISO).getTime();
      return Number.isFinite(s) && Number.isFinite(en) && en > from && s < to;
    })
    .sort((a, b) => (a.startAtISO > b.startAtISO ? 1 : -1));
}

export function listScheduleEntriesForEngineer(engineerEmail: string, fromISO: string, toISO: string): ScheduleEntry[] {
  const e = String(engineerEmail || "").trim().toLowerCase();
  if (!e) return [];
  return listScheduleEntries(fromISO, toISO).filter((s) => (s.engineerEmail || "").trim().toLowerCase() === e);
}

export function createScheduleEntry(input: Omit<ScheduleEntry, "id" | "createdAtISO" | "updatedAtISO">): ScheduleEntry {
  const db = readDb();
  const now = new Date().toISOString();
  const entry: ScheduleEntry = {
    id: crypto.randomUUID(),
    jobId: input.jobId,
    engineerId: input.engineerId,
    engineerEmail: input.engineerEmail,
    startAtISO: input.startAtISO,
    endAtISO: input.endAtISO,
    notes: input.notes,
    createdAtISO: now,
    updatedAtISO: now,
  };
  db.scheduleEntries.push(entry);
  writeDb(db);
  return entry;
}

export function ensureInvoiceForQuote(quoteId: string): Invoice | null {
  const q = getQuoteById(quoteId);
  if (!q) return null;

  const db = readDb();
  const existing = db.invoices.find((i) => i.quoteId === quoteId);
  if (existing) return existing;

  const totals = quoteTotals(q);
  const inv = createInvoice({
    quoteId,
    clientId: (q as any).clientId,
    clientName: q.clientName,
    clientEmail: q.clientEmail,
    subtotal: totals.subtotal,
    vat: totals.vat,
    total: totals.total,
  });

  return inv;
}
export function listAuditForEntity(entityType: AuditEvent["entityType"], entityId: string): AuditEvent[] {
  const db = readDb();
  return db.audit
    .filter((e) => e.entityType === entityType && e.entityId === entityId)
    .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1));
}

function addAudit(event: Omit<AuditEvent, "id" | "createdAtISO">) {
  const db = readDb();
  const e: AuditEvent = {
    id: crypto.randomUUID(),
    createdAtISO: new Date().toISOString(),
    ...event,
  };
  db.audit.push(e);
  writeDb(db);
  return e;
}

export function recordEmailSent(input: {
  entityType: AuditEvent["entityType"];
  entityId: string;
  actorRole: Role | "system";
  actor?: string;
  meta?: Record<string, unknown>;
}) {
  return addAudit({
    entityType: input.entityType,
    entityId: input.entityId,
    action: "email.sent",
    actorRole: input.actorRole,
    actor: input.actor,
    meta: input.meta,
  });
}

export function recordEmailFailed(input: {
  entityType: AuditEvent["entityType"];
  entityId: string;
  actorRole: Role | "system";
  actor?: string;
  meta?: Record<string, unknown>;
}) {
  return addAudit({
    entityType: input.entityType,
    entityId: input.entityId,
    action: "email.failed",
    actorRole: input.actorRole,
    actor: input.actor,
    meta: input.meta,
  });
}

export function listFailedEmailAttempts(limit = 200): AuditEvent[] {
  const db = readDb();
  return db.audit
    .filter((e) => e.action === "email.failed")
    .sort((a, b) => (a.createdAtISO < b.createdAtISO ? 1 : -1))
    .slice(0, limit);
}

export function getQuoteById(id: string): Quote | null {
  return readDb().quotes.find((q) => q.id === id) ?? null;
}

export function getQuoteByToken(token: string): Quote | null {
  return readDb().quotes.find((q) => q.token === token) ?? null;
}

export function createQuote(input: {
    clientName: string;
    clientEmail: string;
    clientId?: string;
  siteAddress?: string;
  notes?: string;
  vatRate?: number;
  items?: Array<Pick<QuoteItem, "description" | "qty" | "unitPrice">>;
}): Quote {
  const db = readDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const token = crypto.randomBytes(24).toString("hex");

const client = input.clientId ? db.clients.find((c) => c.id === input.clientId) : null;
const resolvedName = String(input.clientName ?? "").trim() || (client?.name ?? "");
const resolvedEmail = String(input.clientEmail ?? "").trim().toLowerCase() || (client?.email ?? "");
const resolvedSiteAddress = (input.siteAddress ?? "").trim() || (client ? clientDisplayAddress(client) : "");

  const items: QuoteItem[] = (input.items ?? []).map((it) => ({
    id: crypto.randomUUID(),
    description: String(it.description ?? "").trim(),
    qty: Number(it.qty ?? 1),
    unitPrice: Number(it.unitPrice ?? 0),
  }));

  const q: Quote = {
    id,
    token,
    clientId: input.clientId || undefined,
    clientName: resolvedName,
    clientEmail: resolvedEmail,
    siteAddress: resolvedSiteAddress || undefined,
    notes: input.notes?.trim() || undefined,
    vatRate: typeof input.vatRate === "number" ? input.vatRate : 0.2,
    items,
    status: "draft",
    createdAtISO: now,
    updatedAtISO: now,
  };

  db.quotes.push(q);
  writeDb(db);

  addAudit({
    entityType: "quote",
    entityId: q.id,
    action: "quote.created",
    actorRole: "admin",
    meta: { clientEmail: q.clientEmail },
  });
  return q;
}

export function updateQuote(id: string, patch: Partial<Omit<Quote, "id" | "token" | "createdAtISO">>): Quote | null {
  const db = readDb();
  const idx = db.quotes.findIndex((q) => q.id === id);
  if (idx === -1) return null;

  const existing = db.quotes[idx];
  const next: Quote = {
    ...existing,
    ...patch,
    // never allow token overwrite
    token: existing.token,
    id: existing.id,
    createdAtISO: existing.createdAtISO,
    updatedAtISO: new Date().toISOString(),
  };

  db.quotes[idx] = next;
  writeDb(db);

  if (patch.status === "sent") {
    addAudit({
      entityType: "quote",
      entityId: id,
      action: "quote.sent",
      actorRole: "admin",
    });
  }
  return next;
}

export function rotateQuoteToken(id: string): Quote | null {
  const db = readDb();
  const idx = db.quotes.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  const existing = db.quotes[idx];
  const next: Quote = {
    ...existing,
    token: crypto.randomBytes(24).toString("hex"),
    updatedAtISO: new Date().toISOString(),
  };
  db.quotes[idx] = next;
  writeDb(db);
  addAudit({
    entityType: "quote",
    entityId: id,
    action: "token.rotated",
    actorRole: "admin",
    meta: { info: "token.rotated" },
  });
  return next;
}

export function getAgreementById(id: string): Agreement | null {
  return readDb().agreements.find((a) => a.id === id) ?? null;
}

export function getAgreementByToken(token: string): Agreement | null {
  return readDb().agreements.find((a) => a.token === token) ?? null;
}

export function getAgreementForQuote(quoteId: string): Agreement | null {
  return readDb().agreements.find((a) => a.quoteId === quoteId) ?? null;
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function computeAgreementCertificateHash(agreement: Agreement) {
  // Stable-ish hash for verification: templateVersion + quote snapshot + signer identity + timestamps.
  // Avoid including volatile fields like updatedAt.
  const payload = {
    templateVersion: agreement.templateVersion,
    quoteSnapshot: agreement.quoteSnapshot,
    signedAtISO: agreement.signedAtISO,
    signerName: agreement.signerName,
    signerEmail: agreement.signerEmail,
    signerIp: agreement.signerIp,
    signerUserAgent: agreement.signerUserAgent,
  };
  return sha256Hex(JSON.stringify(payload));
}

export function ensureAgreementForQuote(quoteId: string): Agreement | null {
  const db = readDb();
  const q = db.quotes.find((x) => x.id === quoteId);
  if (!q) return null;

  const existing = db.agreements.find((a) => a.quoteId === quoteId);
  if (existing) return existing;

  const now = new Date().toISOString();

  const a: Agreement = {
    id: crypto.randomUUID(),
    token: crypto.randomBytes(24).toString("hex"),
    clientId: q.clientId || undefined, // ✅ no "any"
    quoteId,
    status: "draft",
    templateVersion: "v1",
    quoteSnapshot: q,
    createdAtISO: now,
    updatedAtISO: now,
  };

  db.agreements.push(a);
  writeDb(db);

  addAudit({
    entityType: "agreement",
    entityId: a.id,
    action: "agreement.created",
    actorRole: "system",
    meta: { quoteId },
  });

  return a;
}

export function signAgreementByToken(
  token: string,
  input: { signerName: string; signerEmail?: string; signerIp?: string; signerUserAgent?: string }
): Agreement | null {
  const db = readDb();
  const idx = db.agreements.findIndex((a) => a.token === token);
  if (idx === -1) return null;

  const existing = db.agreements[idx];
  if (existing.status === "signed") return existing;

  const now = new Date().toISOString();
  const next: Agreement = {
    ...existing,
    status: "signed",
    signerName: String(input.signerName ?? "").trim(),
    signerEmail: input.signerEmail?.trim()?.toLowerCase() || undefined,
    signerIp: input.signerIp,
    signerUserAgent: input.signerUserAgent,
    signedAtISO: now,
    updatedAtISO: now,
  };
  next.certificateHash = computeAgreementCertificateHash(next);
  db.agreements[idx] = next;
  writeDb(db);

  // Create invoice automatically on signature (idempotent)
  ensureInvoiceForQuote(next.quoteId);
  // Create job automatically on signature (idempotent)
  ensureJobForQuote(next.quoteId);

  addAudit({
    entityType: "agreement",
    entityId: next.id,
    action: "agreement.signed",
    actorRole: "client",
    actor: next.signerEmail,
    meta: { signerName: next.signerName },
  });
  return next;
}

export function acceptQuoteByToken(token: string): Quote | null {
  const db = readDb();
  const idx = db.quotes.findIndex((q) => q.token === token);
  if (idx === -1) return null;

  const existing = db.quotes[idx];
  if (existing.status === "accepted") return existing;

  const now = new Date().toISOString();
  const next: Quote = {
    ...existing,
    status: "accepted",
    acceptedAtISO: now,
    updatedAtISO: now,
  };
  db.quotes[idx] = next;
  writeDb(db);

  addAudit({
    entityType: "quote",
    entityId: next.id,
    action: "quote.accepted",
    actorRole: "client",
    actor: next.clientEmail,
  });

  // Create agreement automatically on acceptance (idempotent).
  ensureAgreementForQuote(next.id);
  return next;
}
