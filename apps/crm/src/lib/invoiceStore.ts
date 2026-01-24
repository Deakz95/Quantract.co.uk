"use client";

import { clampMoney } from "@/lib/invoiceMath";
import { getQuoteSettings } from "@/lib/quoteStore";

/**
 * Client-side invoice store (localStorage).
 * This keeps the demo UI fully interactive.
 * Phase B+ should migrate this to server APIs / Prisma the same way quotes are handled.
 */

export type InvoiceStatus = "draft" | "sent" | "unpaid" | "paid";
export type InvoiceKind = "quote" | "manual";

export type Invoice = {
  id: string;
  quoteId?: string | null;

  clientName?: string;
  clientEmail?: string;

  /** Legacy */
  amount?: number;

  /** Ex VAT */
  subtotal: number;
  /** VAT amount (money) */
  vat: number;
  /** subtotal + vat */
  total: number;

  kind?: InvoiceKind;
  status: InvoiceStatus;
  createdAtISO: string;
};

export type InvoiceRecord = Invoice;

const KEY = "qt_invoices_v1";

function loadAll(): InvoiceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as InvoiceRecord[]).map(normalizeInvoice) : [];
  } catch {
    return [];
  }
}

function saveAll(all: InvoiceRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function normalizeInvoice(raw: Partial<Invoice> & { id: string }): Invoice {
  const subtotal = Number(raw.subtotal ?? 0);
  const vat = Number(raw.vat ?? 0);
  const total = Number(raw.total ?? raw.amount ?? subtotal + vat);

  const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;
  const safeVat = Number.isFinite(vat) ? vat : 0;
  const safeTotal = Number.isFinite(total) ? total : safeSubtotal + safeVat;

  return {
    id: raw.id,
    quoteId: raw.quoteId ?? null,
    clientName: raw.clientName,
    clientEmail: raw.clientEmail,
    amount: raw.amount,
    subtotal: clampMoney(safeSubtotal),
    vat: clampMoney(safeVat),
    total: clampMoney(safeTotal),
    kind: raw.kind,
    status: (raw.status ?? "draft") as InvoiceStatus,
    createdAtISO: raw.createdAtISO ?? new Date().toISOString(),
  };
}

export function getAllInvoices(): Invoice[] {
  return loadAll();
}

export function getInvoice(invoiceId: string): Invoice | null {
  const all = loadAll();
  return all.find((x) => x.id === invoiceId) ?? null;
}

export function upsertInvoice(invoice: Invoice) {
  const next = normalizeInvoice(invoice);
  const all = loadAll();
  const idx = all.findIndex((x) => x.id === next.id);
  if (idx === -1) all.push(next);
  else all[idx] = next;
  saveAll(all);
}

export function getInvoicesForQuote(quoteId: string): Invoice[] {
  return loadAll().filter((x) => x.quoteId === quoteId);
}

/**
 * Ensures an invoice exists for a quote (demo).
 * - If one exists: returns it
 * - If none: creates a "quote" invoice using QuoteSettings.quoteTotal (if present)
 */
export function ensureNextStageInvoice(quoteId: string): Invoice {
  const existing = getInvoicesForQuote(quoteId)[0];
  if (existing) return existing;

  const settings = getQuoteSettings(quoteId);
  const total = clampMoney(Number(settings.quoteTotal ?? 0));
  const vat = 0; // VAT is editable in InvoiceBuilder; keep default 0 here
  const subtotal = clampMoney(total - vat);

  const created: Invoice = {
    id: crypto.randomUUID(),
    quoteId,
    kind: "quote",
    status: "draft",
    createdAtISO: new Date().toISOString(),
    subtotal,
    vat,
    total: clampMoney(subtotal + vat),
  };

  upsertInvoice(created);
  return created;
}
