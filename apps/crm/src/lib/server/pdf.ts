type PDFPage = any;
import { PDFDocument as PDFDocumentFactory, StandardFonts } from "pdf-lib";
import type { Agreement, Quote, Invoice, Certificate, CertificateTestResult, Client, Site, Variation } from "@/lib/server/db";
import { quoteTotals } from "@/lib/server/db";
import { normalizeCertificateData, signatureIsPresent } from "@/lib/certificates";
import QRCode from "qrcode";
import { renderFromTemplate, type TemplateLayout } from "@/lib/server/pdfTemplateRenderer";
import { getPrisma } from "@/lib/server/prisma";

export type BrandContext = {
  name: string;
  tagline?: string | null;
  logoPngBytes?: Uint8Array | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  footerLine1?: string | null;
  footerLine2?: string | null;
  contactDetails?: string | null;
};

type PdfPage = PDFPage;

type PdfFont = unknown;
type PdfDocument = Awaited<ReturnType<typeof PDFDocumentFactory.create>>;

export const DEFAULT_BRAND: BrandContext = {
  name: process.env.QT_BRAND_NAME || "Quantract",
  tagline: process.env.QT_BRAND_TAGLINE || null,
  logoPngBytes: null,
};

function hexToRgb(hex: string): any {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return undefined;
  return { type: "RGB", red: r, green: g, blue: b };
}

function pounds(n: number) {
  return `£${n.toFixed(2)}`;
}

export async function newDoc() {
  const doc = await PDFDocumentFactory.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, font, bold };
}

export async function drawBrandHeader(args: {
  doc: PdfDocument;
  page: PdfPage;
  font: PdfFont;
  bold: PdfFont;
  brand?: BrandContext;
  left: number;
  y: number;
}): Promise<number> {
  const { doc, page, bold, font, brand, left } = args;
  let y = args.y;
  const b = brand ?? DEFAULT_BRAND;

  // Optional logo
  try {
    if (b.logoPngBytes && b.logoPngBytes.length > 0) {
      const img = await doc.embedPng(b.logoPngBytes);
      const w = 120;
      const h = (img.height / img.width) * w;
      page.drawImage(img, { x: left, y: y - h + 10, width: w, height: h });
      y -= h + 6;
    }
  } catch {
    // ignore logo embed failures
  }

  const nameColor = b.primaryColor ? hexToRgb(b.primaryColor) : undefined;
  page.drawText(String(b.name || "").toUpperCase(), { x: left, y, size: 18, font: bold, ...(nameColor ? { color: nameColor } : {}) });
  y -= 24;
  if (b.tagline) {
    page.drawText(String(b.tagline), { x: left, y, size: 10, font });
    y -= 18;
  }

  // Accent separator line
  const accentRgb = b.accentColor ? hexToRgb(b.accentColor) : undefined;
  if (accentRgb) {
    const pageWidth = page.getWidth();
    page.drawLine({ start: { x: left, y: y + 4 }, end: { x: pageWidth - left, y: y + 4 }, thickness: 0.75, color: accentRgb });
    y -= 6;
  }

  return y;
}

export function drawBrandFooter(args: {
  page: PdfPage;
  font: PdfFont;
  brand?: BrandContext;
}) {
  const { page, font, brand } = args;
  const b = brand ?? DEFAULT_BRAND;
  const pageWidth = page.getWidth();
  const centerX = pageWidth / 2;
  const textColor = b.primaryColor ? hexToRgb(b.primaryColor) : undefined;
  let footerY = 45;

  const lines: string[] = [];
  if (b.footerLine1) lines.push(String(b.footerLine1));
  if (b.footerLine2) lines.push(String(b.footerLine2));
  if (b.contactDetails) {
    // contactDetails can be multi-line — split and add each
    for (const seg of String(b.contactDetails).split("\n")) {
      const trimmed = seg.trim();
      if (trimmed) lines.push(trimmed);
    }
  }

  if (lines.length === 0) return;

  // Draw from bottom up
  const fontSize = 7;
  const lineHeight = fontSize + 4;
  footerY = 20 + lines.length * lineHeight;

  for (const text of lines) {
    const approxWidth = text.length * (fontSize * 0.5);
    const x = Math.max(20, centerX - approxWidth / 2);
    page.drawText(text, { x, y: footerY, size: fontSize, font, ...(textColor ? { color: textColor } : {}) });
    footerY -= lineHeight;
  }
}

export async function renderQuotePdf(q: Quote, brand?: BrandContext) {
  const { doc, font, bold } = await newDoc();
  const page = doc.addPage([595.28, 841.89]); // A4
  let y = 800;
  const left = 50;

  const line = (text: string, opts?: { size?: number; bold?: boolean }) => {
    const size = opts?.size ?? 11;
    const used = opts?.bold ? bold : font;
    page.drawText(text, { x: left, y, size, font: used });
    y -= size + 6;
  };

  y = await drawBrandHeader({ doc, page, font, bold, brand, left, y });
  line("Quote", { size: 14, bold: true });
  y -= 6;
  line(`Quote ID: ${q.id}`, { size: 10 });
  line(`Created: ${new Date(q.createdAtISO).toLocaleString("en-GB")}`, { size: 10 });
  if (q.status === "accepted" && q.acceptedAtISO) line(`Accepted: ${new Date(q.acceptedAtISO).toLocaleString("en-GB")}`, { size: 10 });
  y -= 10;

  line("Client", { bold: true });
  line(q.clientName);
  line(q.clientEmail);
  if (q.siteAddress) line(q.siteAddress);
  if (q.notes) {
    y -= 6;
    line("Notes", { bold: true });
    line(q.notes);
  }

  y -= 12;
  line("Items", { bold: true });
  y -= 4;

  const startY = y;
  const col1 = left;
  const col2 = 380;
  const col3 = 470;
  page.drawText("Description", { x: col1, y, size: 10, font: bold });
  page.drawText("Qty", { x: col2, y, size: 10, font: bold });
  page.drawText("Line", { x: col3, y, size: 10, font: bold });
  y -= 18;

  for (const it of q.items) {
    const lineTotal = it.qty * it.unitPrice;
    page.drawText(it.description.slice(0, 70), { x: col1, y, size: 10, font });
    page.drawText(String(it.qty), { x: col2, y, size: 10, font });
    page.drawText(pounds(lineTotal), { x: col3, y, size: 10, font });
    y -= 14;
    if (y < 120) break; // keep simple for MVP
  }

  // Totals
  const { subtotal, vat, total } = quoteTotals(q);
  y = Math.min(y, startY - 14 * Math.max(q.items.length, 1) - 10);
  y -= 10;
  page.drawText(`Subtotal: ${pounds(subtotal)}`, { x: col3 - 40, y, size: 10, font: bold });
  y -= 14;
  page.drawText(`VAT (${Math.round(q.vatRate * 100)}%): ${pounds(vat)}`, { x: col3 - 40, y, size: 10, font: bold });
  y -= 16;
  page.drawText(`Total: ${pounds(total)}`, { x: col3 - 40, y, size: 12, font: bold });

  drawBrandFooter({ page, font, brand });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export async function renderClientAgreementPdf(a: Agreement, brand?: BrandContext) {
  const { doc, font, bold } = await newDoc();
  const page = doc.addPage([595.28, 841.89]);
  let y = 800;
  const left = 50;

  const line = (text: string, opts?: { size?: number; bold?: boolean }) => {
    const size = opts?.size ?? 11;
    const used = opts?.bold ? bold : font;
    page.drawText(text, { x: left, y, size, font: used });
    y -= size + 6;
  };

  y = await drawBrandHeader({ doc, page, font, bold, brand, left, y });
  line("Agreement for Works", { size: 14, bold: true });
  y -= 6;
  line(`Created: ${new Date(a.createdAtISO).toLocaleString("en-GB")}`, { size: 10 });
  y -= 10;

  const q = a.quoteSnapshot;

  line("Parties", { bold: true });
  line(`Company: ${(brand ?? DEFAULT_BRAND).name}`, { size: 10 });
  line(`Client: ${q.clientName} (${q.clientEmail})`, { size: 10 });
  y -= 8;

  line("Scope", { bold: true });
  line("This agreement confirms the works described in the associated quote.", { size: 10 });
  line("Any changes must be agreed in writing before commencement.", { size: 10 });
  y -= 8;

  line("Payment Terms", { bold: true });
  line("Invoices are payable according to the terms on the invoice.", { size: 10 });
  y -= 12;

  // Quote summary table
  if (q.items && q.items.length > 0) {
    line("Quote Summary", { bold: true });
    y -= 4;

    const col1 = left;
    const col2 = 380;
    const col3 = 470;
    page.drawText("Description", { x: col1, y, size: 10, font: bold });
    page.drawText("Qty", { x: col2, y, size: 10, font: bold });
    page.drawText("Line", { x: col3, y, size: 10, font: bold });
    y -= 18;

    for (const it of q.items) {
      const lineTotal = it.qty * it.unitPrice;
      page.drawText(it.description.slice(0, 70), { x: col1, y, size: 10, font });
      page.drawText(String(it.qty), { x: col2, y, size: 10, font });
      page.drawText(pounds(lineTotal), { x: col3, y, size: 10, font });
      y -= 14;
      if (y < 140) break;
    }

    const { subtotal, vat, total } = quoteTotals(q);
    y -= 10;
    page.drawText(`Subtotal: ${pounds(subtotal)}`, { x: col3 - 40, y, size: 10, font: bold });
    y -= 14;
    page.drawText(`VAT (${Math.round(q.vatRate * 100)}%): ${pounds(vat)}`, { x: col3 - 40, y, size: 10, font: bold });
    y -= 16;
    page.drawText(`Total: ${pounds(total)}`, { x: col3 - 40, y, size: 12, font: bold });
    y -= 20;
  }

  line("Signatures", { bold: true });
  if (a.status !== "signed") {
    line("Not yet signed.");
  } else {
    if (a.signerName) line(`Signed by: ${a.signerName}`, { size: 10 });
    if (a.signedAtISO) line(`Signed: ${new Date(a.signedAtISO).toLocaleString("en-GB")}`, { size: 10 });
  }

  // Footer: page number
  page.drawText("Page 1 of 1", { x: 270, y: 30, size: 8, font });

  drawBrandFooter({ page, font, brand });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export async function renderAuditAgreementPdf(a: Agreement) {
  const { doc, font, bold } = await newDoc();
  const page = doc.addPage([595.28, 841.89]);
  let y = 800;
  const left = 50;

  const line = (text: string, opts?: { size?: number; bold?: boolean }) => {
    const size = opts?.size ?? 11;
    const used = opts?.bold ? bold : font;
    page.drawText(text, { x: left, y, size, font: used });
    y -= size + 6;
  };

  y = await drawBrandHeader({ doc, page, font, bold, brand: DEFAULT_BRAND, left, y });
  line("Agreement for Works", { size: 14, bold: true });
  y -= 6;
  line(`Agreement ID: ${a.id}`, { size: 10 });
  line(`Template: ${a.templateVersion}`, { size: 10 });
  line(`Created: ${new Date(a.createdAtISO).toLocaleString("en-GB")}`, { size: 10 });
  y -= 10;

  const q = a.quoteSnapshot;
  line("Quote Snapshot", { bold: true });
  line(`Client: ${q.clientName} (${q.clientEmail})`, { size: 10 });
  line(`Quote ID: ${q.id}`, { size: 10 });
  y -= 8;

  line("Scope", { bold: true });
  line("This agreement confirms the works described in the associated quote.", { size: 10 });
  line("Any changes must be agreed in writing before commencement.", { size: 10 });
  y -= 8;

  line("Payment", { bold: true });
  line("Invoices are payable according to the terms on the invoice.", { size: 10 });
  y -= 12;

  line("Signature Certificate", { bold: true });
  if (a.status !== "signed") {
    line("Not yet signed.");
  } else {
    line(`Signed by: ${a.signerName ?? ""}`.trim(), { size: 10 });
    if (a.signerEmail) line(`Email: ${a.signerEmail}`, { size: 10 });
    if (a.signedAtISO) line(`Signed at: ${new Date(a.signedAtISO).toLocaleString("en-GB")}`, { size: 10 });
    if (a.signerIp) line(`IP: ${a.signerIp}`, { size: 10 });
    if (a.signerUserAgent) line(`User-Agent: ${String(a.signerUserAgent).slice(0, 90)}`, { size: 10 });
    if (a.certificateHash) line(`Certificate hash (SHA-256): ${a.certificateHash}`, { size: 8 });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}


export async function renderInvoicePdf(
  inv: Invoice,
  brand?: BrandContext,
  opts?: { lineItems?: Array<{ description?: string; qty: number; unitPrice: number }>; vatRate?: number },
) {
  const { doc, font, bold } = await newDoc();
  const page = doc.addPage([595.28, 841.89]); // A4
  let y = 800;
  const left = 50;

  const line = (text: string, opts?: { size?: number; bold?: boolean; x?: number }) => {
    const size = opts?.size ?? 11;
    const used = opts?.bold ? bold : font;
    page.drawText(text, { x: opts?.x ?? left, y, size, font: used });
    y -= size + 6;
  };

  y = await drawBrandHeader({ doc, page, font, bold, brand, left, y });
  line("Invoice", { size: 14, bold: true });
  y -= 6;
  if (inv.invoiceNumber) line(`Invoice No: ${inv.invoiceNumber}`, { size: 10 });
  line(`Invoice ID: ${inv.id}`, { size: 10 });
  line(`Created: ${new Date(inv.createdAtISO).toLocaleString("en-GB")}`, { size: 10 });
  if (inv.status === "paid" && inv.paidAtISO) line(`Paid: ${new Date(inv.paidAtISO).toLocaleString("en-GB")}`, { size: 10 });
  y -= 10;

  line("Bill To", { bold: true });
  line(inv.clientName);
  line(inv.clientEmail);
  y -= 12;

  // Line items table (if available from linked quote)
  const items = opts?.lineItems;
  if (items && items.length > 0) {
    line("Line Items", { bold: true });
    y -= 2;
    // Table header
    const colDesc = left;
    const colQty = 340;
    const colUnit = 400;
    const colLine = 480;
    const hdrSize = 9;
    page.drawText("Description", { x: colDesc, y, size: hdrSize, font: bold });
    page.drawText("Qty", { x: colQty, y, size: hdrSize, font: bold });
    page.drawText("Unit £", { x: colUnit, y, size: hdrSize, font: bold });
    page.drawText("Line £", { x: colLine, y, size: hdrSize, font: bold });
    y -= hdrSize + 8;

    for (const item of items) {
      const desc = (item.description || "Item").slice(0, 60);
      const lineTotal = Math.round(item.qty * item.unitPrice * 100) / 100;
      page.drawText(desc, { x: colDesc, y, size: 10, font });
      page.drawText(String(item.qty), { x: colQty, y, size: 10, font });
      page.drawText(pounds(item.unitPrice), { x: colUnit, y, size: 10, font });
      page.drawText(pounds(lineTotal), { x: colLine, y, size: 10, font });
      y -= 16;
    }
    y -= 4;
  }

  line("Summary", { bold: true });
  line(`Subtotal (ex VAT): ${pounds(inv.subtotal)}`, { size: 11 });
  const vatPct = opts?.vatRate != null ? Math.round(opts.vatRate * 100) : Math.round((inv.subtotal > 0 ? inv.vat / inv.subtotal : 0.2) * 100);
  line(`VAT (${vatPct}%): ${pounds(inv.vat)}`, { size: 11 });
  line(`Total (inc VAT): ${pounds(inv.total)}`, { size: 12, bold: true });

  y -= 10;
  line(`Status: ${inv.status.toUpperCase()}`, { size: 10, bold: true });

  drawBrandFooter({ page, font, brand });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}



export async function renderReceiptPdf(input: {
  invoice: Invoice;
  payment: { id: string; amount: number; currency: string; provider: string; status: string; receivedAtISO: string };
  brand?: BrandContext;
}) {
  const { invoice: inv, payment } = input;
  const { doc, font, bold } = await newDoc();
  const page = doc.addPage([595.28, 841.89]);
  let y = 800;
  const left = 50;

  const line = (text: string, opts?: { size?: number; bold?: boolean }) => {
    const size = opts?.size ?? 11;
    const used = opts?.bold ? bold : font;
    page.drawText(text, { x: left, y, size, font: used });
    y -= size + 6;
  };

  y = await drawBrandHeader({ doc, page, font, bold, brand: input.brand, left, y });

  line("Payment Receipt", { size: 14, bold: true });
  y -= 6;

  if (inv.invoiceNumber) line(`Invoice No: ${inv.invoiceNumber}`, { size: 10 });
  line(`Invoice ID: ${inv.id}`, { size: 10 });
  line(`Receipt ID: ${payment.id}`, { size: 10 });
  line(`Paid at: ${new Date(payment.receivedAtISO).toLocaleString("en-GB")}`, { size: 10 });
  y -= 10;

  line("Paid By", { bold: true });
  line(inv.clientName);
  line(inv.clientEmail);
  y -= 12;

  const cur = String(payment.currency || "gbp").toUpperCase();
  const amt = Number(payment.amount || 0);
  line("Payment", { bold: true });
  line(`Amount: ${cur === "GBP" ? pounds(amt) : `${amt.toFixed(2)} ${cur}`}`, { size: 12, bold: true });
  line(`Provider: ${String(payment.provider || "stripe").toUpperCase()}`, { size: 10 });
  line(`Status: ${String(payment.status || "succeeded").toUpperCase()}`, { size: 10 });

  y -= 10;
  line("Invoice Summary", { bold: true });
  line(`Invoice total: ${pounds(inv.total)}`, { size: 10 });

  drawBrandFooter({ page, font, brand: input.brand });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export async function renderCertificatePdf(input: {
  certificate: Certificate;
  client?: Client | null;
  site?: Site | null;
  testResults?: CertificateTestResult[];
  brand?: BrandContext;
}) {
  const { certificate: c, client, site, testResults } = input;
  const siteAddress = site
    ? [site.address1, site.address2, site.city, site.county, site.postcode, site.country].filter(Boolean).join(", ")
    : "";
  const data = normalizeCertificateData(c.type, c.data ?? {}, {
    jobId: c.jobId,
    siteName: site?.name ?? undefined,
    siteAddress,
    clientName: client?.name ?? undefined,
    clientEmail: client?.email ?? undefined,
    inspectorName: c.inspectorName ?? undefined,
  });
  const { doc, font, bold } = await newDoc();
  const page = doc.addPage([595.28, 841.89]); // A4
  let y = 800;
  const left = 50;

  const line = (text: string, opts?: { size?: number; bold?: boolean }) => {
    const size = opts?.size ?? 11;
    const used = opts?.bold ? bold : font;
    page.drawText(text, { x: left, y, size, font: used });
    y -= size + 6;
  };
  const labelValue = (label: string, value?: string, size = 10) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;
    line(`${label}: ${trimmed}`, { size });
  };
  const paragraph = (label: string, value?: string, size = 10) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;
    line(label, { bold: true, size });
    trimmed.split("\n").forEach((segment) => line(segment, { size }));
    y -= 4;
  };

  y = await drawBrandHeader({ doc, page, font, bold, brand: input.brand, left, y });
  line(`${c.type} Certificate`, { size: 14, bold: true });
  y -= 6;
  line(`Certificate ID: ${c.id}`, { size: 10 });
  if (c.certificateNumber) line(`Certificate No: ${c.certificateNumber}`, { size: 10 });
  line(`Status: ${c.status.toUpperCase()}`, { size: 10 });
  if (c.issuedAtISO) line(`Issued: ${new Date(c.issuedAtISO).toLocaleString("en-GB")}`, { size: 10 });
  y -= 10;

  line("Overview", { bold: true });
  labelValue("Job ref", data.overview.jobReference || c.jobId || "", 10);
  labelValue("Site", data.overview.siteName || site?.name || "", 10);
  labelValue("Installation address", data.overview.installationAddress || siteAddress || "", 10);
  labelValue("Client", data.overview.clientName || client?.name || "", 10);
  labelValue("Client email", data.overview.clientEmail || client?.email || "", 10);
  paragraph("Job description", data.overview.jobDescription, 10);
  y -= 6;

  line("Inspector", { bold: true });
  line(`${c.inspectorName ?? ""}`.trim() || "(not set)", { size: 10 });
  if (c.inspectorEmail) line(c.inspectorEmail, { size: 10 });
  y -= 10;

  line("Installation details", { bold: true });
  labelValue("Description of work", data.installation.descriptionOfWork);
  labelValue("Supply type", data.installation.supplyType);
  labelValue("Earthing arrangement", data.installation.earthingArrangement);
  labelValue("Distribution type", data.installation.distributionType);
  labelValue("Max demand", data.installation.maxDemand);
  y -= 6;

  line("Inspection", { bold: true });
  paragraph("Limitations", data.inspection.limitations);
  paragraph("Observations", data.inspection.observations);
  labelValue("Next inspection date", data.inspection.nextInspectionDate);
  y -= 6;

  if (c.type === "EICR") {
    line("Assessment", { bold: true });
    labelValue("Overall assessment", data.assessment.overallAssessment);
    paragraph("Recommendations", data.assessment.recommendations);
    y -= 6;
  }

  line("Declarations", { bold: true });
  labelValue("Extent of work", data.declarations.extentOfWork);
  labelValue("Works tested", data.declarations.worksTested);
  paragraph("Comments", data.declarations.comments);
  y -= 6;

  line("Test Results", { bold: true });
  y -= 4;
  const rows = testResults ?? [];
  if (rows.length === 0) {
    line("No test results recorded.", { size: 10 });
  } else {
    const max = 18;
    for (const r of rows.slice(0, max)) {
      const ref = r.circuitRef ? `Circuit: ${r.circuitRef}` : "Circuit";
      const keys = Object.keys(r.data ?? {});
      const kv = keys
        .slice(0, 6)
        .map((k) => `${k}: ${String((r.data as any)[k])}`)
        .join("  •  ");
      line(ref, { size: 10, bold: true });
      line(kv || "(no data)", { size: 9 });
      y -= 4;
      if (y < 120) break;
    }
    if (rows.length > max) {
      line(`…and ${rows.length - max} more row(s)`, { size: 9 });
    }
  }

  y -= 8;
  line("Sign-off", { bold: true });
  if (signatureIsPresent(data.signatures?.engineer)) {
    line(`Engineer: ${data.signatures?.engineer?.signatureText || data.signatures?.engineer?.name || ""}`, { size: 10 });
    if (data.signatures?.engineer?.signedAtISO) {
      line(`Engineer signed: ${new Date(data.signatures.engineer.signedAtISO).toLocaleString("en-GB")}`, { size: 10 });
    }
  } else {
    line("Engineer: not signed.", { size: 10 });
  }
  if (signatureIsPresent(data.signatures?.customer)) {
    line(`Customer: ${data.signatures?.customer?.signatureText || data.signatures?.customer?.name || ""}`, { size: 10 });
    if (data.signatures?.customer?.signedAtISO) {
      line(`Customer signed: ${new Date(data.signatures.customer.signedAtISO).toLocaleString("en-GB")}`, { size: 10 });
    }
  } else {
    line("Customer: not signed.", { size: 10 });
  }

  drawBrandFooter({ page, font, brand: input.brand });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/**
 * Generate a certificate PDF from a canonical revision snapshot.
 * Used by the issuance service (Stage 3) to produce deterministic PDFs
 * from the immutable snapshot rather than from live mutable DB rows.
 */
export async function renderCertificatePdfFromSnapshot(snapshot: {
  certificateId: string;
  certificateNumber: string | null;
  type: string;
  inspectorName: string | null;
  inspectorEmail: string | null;
  outcome: string | null;
  outcomeReason: string | null;
  data: Record<string, unknown>;
  completedAt: string | null;
  observations: Array<{ code: string; location: string | null; description: string | null; resolvedAt: string | null }>;
  checklists: Array<{ section: string; question: string; answer: string | null }>;
  signatures: Array<{ role: string; signerName: string | null; signatureText: string | null; signedAt: string | null; qualification: string | null }>;
  testResults: Array<{ circuitRef: string | null; data: Record<string, unknown> }>;
  verificationToken?: string | null;
}, opts?: {
  verifyUrl?: string;
  signingHashShort?: string;
}): Promise<Buffer> {
  const { doc, font, bold } = await newDoc();
  const page = doc.addPage([595.28, 841.89]); // A4
  let y = 800;
  const left = 50;

  const line = (text: string, opts?: { size?: number; bold?: boolean }) => {
    const size = opts?.size ?? 11;
    const used = opts?.bold ? bold : font;
    // Truncate to fit page width
    const truncated = String(text || "").slice(0, 100);
    if (y < 60) {
      // Would need pagination — skip for now
      return;
    }
    page.drawText(truncated, { x: left, y, size, font: used });
    y -= size + 6;
  };

  const labelValue = (label: string, value?: string | null, size = 10) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;
    line(`${label}: ${trimmed}`, { size });
  };

  // ── Header ──
  y = await drawBrandHeader({ doc, page, font, bold, left, y });
  line(`${snapshot.type} Certificate`, { size: 14, bold: true });
  y -= 6;
  if (snapshot.certificateNumber) line(`Certificate No: ${snapshot.certificateNumber}`, { size: 10 });
  line(`Certificate ID: ${snapshot.certificateId}`, { size: 10 });
  line(`Status: ISSUED`, { size: 10 });
  if (snapshot.completedAt) line(`Completed: ${new Date(snapshot.completedAt).toLocaleString("en-GB")}`, { size: 10 });
  y -= 10;

  // ── Overview from legacy data blob ──
  const data = snapshot.data as any;
  if (data?.overview) {
    line("Overview", { bold: true });
    labelValue("Job ref", data.overview.jobReference);
    labelValue("Site", data.overview.siteName);
    labelValue("Address", data.overview.installationAddress);
    labelValue("Client", data.overview.clientName);
    y -= 6;
  }

  // ── Inspector ──
  line("Inspector", { bold: true });
  line(snapshot.inspectorName || "(not set)", { size: 10 });
  if (snapshot.inspectorEmail) line(snapshot.inspectorEmail, { size: 10 });
  y -= 6;

  // ── Outcome ──
  if (snapshot.outcome) {
    line("Outcome", { bold: true });
    line(snapshot.outcome.toUpperCase(), { size: 11, bold: true });
    if (snapshot.outcomeReason) line(snapshot.outcomeReason, { size: 9 });
    y -= 6;
  }

  // ── Observations ──
  if (snapshot.observations.length > 0) {
    line("Observations", { bold: true });
    for (const obs of snapshot.observations.slice(0, 15)) {
      const resolved = obs.resolvedAt ? " [RESOLVED]" : "";
      line(`${obs.code} — ${obs.description || ""}${resolved}`, { size: 9 });
      if (obs.location) line(`  Location: ${obs.location}`, { size: 8 });
      y -= 2;
    }
    if (snapshot.observations.length > 15) line(`…and ${snapshot.observations.length - 15} more`, { size: 9 });
    y -= 6;
  }

  // ── Checklist summary ──
  if (snapshot.checklists.length > 0) {
    line("Checklist Summary", { bold: true });
    const sections = new Map<string, { pass: number; fail: number; na: number; total: number }>();
    for (const cl of snapshot.checklists) {
      const s = sections.get(cl.section) || { pass: 0, fail: 0, na: 0, total: 0 };
      s.total++;
      if (cl.answer === "pass") s.pass++;
      else if (cl.answer === "fail") s.fail++;
      else if (cl.answer === "na" || cl.answer === "lim") s.na++;
      sections.set(cl.section, s);
    }
    for (const [section, counts] of sections) {
      line(`${section}: ${counts.pass} pass, ${counts.fail} fail, ${counts.na} N/A (${counts.total} items)`, { size: 9 });
    }
    y -= 6;
  }

  // ── Test results ──
  if (snapshot.testResults.length > 0) {
    line("Test Results", { bold: true });
    const max = 15;
    for (const r of snapshot.testResults.slice(0, max)) {
      const ref = r.circuitRef ? `Circuit: ${r.circuitRef}` : "Circuit";
      const keys = Object.keys(r.data ?? {});
      const kv = keys.slice(0, 6).map((k) => `${k}: ${String((r.data as any)[k])}`).join("  •  ");
      line(ref, { size: 10, bold: true });
      line(kv || "(no data)", { size: 9 });
      y -= 2;
    }
    if (snapshot.testResults.length > max) line(`…and ${snapshot.testResults.length - max} more`, { size: 9 });
    y -= 6;
  }

  // ── Signatures ──
  line("Signatures", { bold: true });
  if (snapshot.signatures.length === 0) {
    // Fall back to legacy data signatures
    const sigs = data?.signatures as any;
    if (sigs?.engineer?.signatureText) line(`Engineer: ${sigs.engineer.signatureText}`, { size: 10 });
    if (sigs?.customer?.signatureText) line(`Customer: ${sigs.customer.signatureText}`, { size: 10 });
  } else {
    for (const sig of snapshot.signatures) {
      const name = sig.signerName || sig.signatureText || "(unsigned)";
      const date = sig.signedAt ? ` — ${new Date(sig.signedAt).toLocaleString("en-GB")}` : "";
      const qual = sig.qualification ? ` (${sig.qualification})` : "";
      line(`${sig.role}: ${name}${qual}${date}`, { size: 10 });
    }
  }

  // ── QR Code + Verification ──
  const verifyUrl = opts?.verifyUrl || buildVerifyUrl(snapshot.verificationToken);
  if (verifyUrl) {
    try {
      const qrPngBuffer = await QRCode.toBuffer(verifyUrl, { width: 80, margin: 1 });
      const qrImage = await doc.embedPng(qrPngBuffer);
      const qrSize = 60;
      const qrX = 595.28 - 50 - qrSize; // top-right area
      const qrY = 30; // footer area
      page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
      page.drawText("Verify:", { x: qrX, y: qrY + qrSize + 4, size: 7, font: bold });
      if (opts?.signingHashShort) {
        page.drawText(`Hash: ${opts.signingHashShort}`, { x: qrX - 10, y: qrY - 10, size: 6, font });
      }
    } catch {
      // QR generation failed — continue without it
    }
  }

  // ── Footer ──
  page.drawText("Page 1 of 1", { x: 270, y: 30, size: 8, font });

  drawBrandFooter({ page, font });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

/** Build public verification URL from token. Returns null if no token or no base URL. */
function buildVerifyUrl(token?: string | null): string | null {
  if (!token) return null;
  const base = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/verify/${token}`;
}

export async function renderVariationPdf(input: {
  variation: Variation;
  client?: Client | null;
  site?: Site | null;
  quoteId?: string | null;
  brand?: BrandContext;
}) {
  const { variation: v, client, site, quoteId, brand } = input;
  const { doc, font, bold } = await newDoc();
  const page = doc.addPage([595.28, 841.89]); // A4
  let y = 800;
  const left = 50;

  const line = (text: string, opts?: { size?: number; bold?: boolean }) => {
    const size = opts?.size ?? 11;
    const used = opts?.bold ? bold : font;
    page.drawText(text, { x: left, y, size, font: used });
    y -= size + 6;
  };

  y = await drawBrandHeader({ doc, page, font, bold, brand, left, y });
  line("Variation", { size: 14, bold: true });
  y -= 6;
  line(`Variation ID: ${v.id}`, { size: 10 });
  if (v.token) line(`Client token: ${v.token}`, { size: 10 });
  if (quoteId) line(`Linked quote: ${quoteId}`, { size: 10 });
  if (v.jobId) line(`Linked job: ${v.jobId}`, { size: 10 });
  line(`Status: ${v.status.toUpperCase()}`, { size: 10 });
  if (v.approvedAtISO) line(`Approved: ${new Date(v.approvedAtISO).toLocaleString("en-GB")}`, { size: 10 });
  y -= 10;

  line("Client", { bold: true });
  if (client) {
    line(client.name);
    line(client.email);
  } else {
    line("(client not linked)", { size: 10 });
  }

  y -= 6;
  line("Site", { bold: true });
  const siteAddr = site
    ? [site.address1, site.address2, site.city, site.county, site.postcode, site.country].filter(Boolean).join(", ")
    : "(site not linked)";
  line(site?.name ? `${site.name} — ${siteAddr}` : siteAddr, { size: 10 });
  if (v.reason) {
    y -= 6;
    line("Reason", { bold: true });
    line(v.reason, { size: 10 });
  }

  y -= 12;
  line("Items", { bold: true });
  y -= 4;

  const col1 = left;
  const col2 = 380;
  const col3 = 470;
  page.drawText("Description", { x: col1, y, size: 10, font: bold });
  page.drawText("Qty", { x: col2, y, size: 10, font: bold });
  page.drawText("Line", { x: col3, y, size: 10, font: bold });
  y -= 18;

  for (const it of v.items) {
    const lineTotal = it.qty * it.unitPrice;
    page.drawText(it.description.slice(0, 70), { x: col1, y, size: 10, font });
    page.drawText(String(it.qty), { x: col2, y, size: 10, font });
    page.drawText(pounds(lineTotal), { x: col3, y, size: 10, font });
    y -= 14;
    if (y < 140) break;
  }

  y -= 10;
  page.drawText(`Subtotal: ${pounds(v.subtotal)}`, { x: col3 - 40, y, size: 10, font: bold });
  y -= 14;
  page.drawText(`VAT (${Math.round(v.vatRate * 100)}%): ${pounds(v.vat)}`, { x: col3 - 40, y, size: 10, font: bold });
  y -= 16;
  page.drawText(`Total: ${pounds(v.total)}`, { x: col3 - 40, y, size: 12, font: bold });

  drawBrandFooter({ page, font, brand });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// ── Check PDF ──

export async function renderCheckPdf(input: {
  title: string;
  asset?: { type: string; name: string; identifier?: string | null } | null;
  items: Array<{
    title: string;
    isRequired: boolean;
    status: string;
    notes?: string | null;
    completedBy?: string | null;
    completedAt?: string | null;
  }>;
  notes?: string | null;
  completedAt?: string | null;
  brand?: BrandContext;
}): Promise<Buffer> {
  const { doc, font, bold } = await newDoc();
  const page = doc.addPage([595.28, 841.89]); // A4
  let y = 800;
  const left = 50;

  const line = (text: string, opts?: { size?: number; bold?: boolean }) => {
    const size = opts?.size ?? 11;
    const used = opts?.bold ? bold : font;
    if (y < 60) return;
    page.drawText(String(text || "").slice(0, 100), { x: left, y, size, font: used });
    y -= size + 6;
  };

  y = await drawBrandHeader({ doc, page, font, bold, brand: input.brand, left, y });
  line("Vehicle / Asset Check", { size: 14, bold: true });
  y -= 6;

  line(`Check: ${input.title}`, { size: 11, bold: true });
  if (input.completedAt) {
    line(`Completed: ${new Date(input.completedAt).toLocaleString("en-GB")}`, { size: 10 });
  }
  y -= 8;

  if (input.asset) {
    line("Asset", { bold: true });
    line(`Type: ${input.asset.type.charAt(0).toUpperCase() + input.asset.type.slice(1)}`, { size: 10 });
    line(`Name: ${input.asset.name}`, { size: 10 });
    if (input.asset.identifier) {
      line(`Identifier: ${input.asset.identifier}`, { size: 10 });
    }
    y -= 8;
  }

  line("Check Items", { bold: true });
  y -= 4;

  const colTitle = left;
  const colReq = 300;
  const colStatus = 370;
  const colNotes = 440;

  page.drawText("Item", { x: colTitle, y, size: 9, font: bold });
  page.drawText("Required", { x: colReq, y, size: 9, font: bold });
  page.drawText("Status", { x: colStatus, y, size: 9, font: bold });
  page.drawText("Notes", { x: colNotes, y, size: 9, font: bold });
  y -= 16;

  for (const item of input.items) {
    if (y < 80) break;
    page.drawText(item.title.slice(0, 50), { x: colTitle, y, size: 9, font });
    page.drawText(item.isRequired ? "Yes" : "No", { x: colReq, y, size: 9, font });
    const statusLabel = item.status === "completed" ? "Pass" : item.status === "na" ? "N/A" : "Pending";
    page.drawText(statusLabel, { x: colStatus, y, size: 9, font });
    if (item.notes) {
      page.drawText(item.notes.slice(0, 20), { x: colNotes, y, size: 8, font });
    }
    y -= 14;
  }

  y -= 6;
  const passCount = input.items.filter((i) => i.status === "completed").length;
  const naCount = input.items.filter((i) => i.status === "na").length;
  const pendCount = input.items.filter((i) => i.status === "pending").length;
  line(`Summary: ${passCount} passed, ${naCount} N/A, ${pendCount} pending (${input.items.length} total)`, { size: 10 });

  if (input.notes) {
    y -= 6;
    line("Notes", { bold: true });
    line(input.notes.slice(0, 200), { size: 10 });
  }

  drawBrandFooter({ page, font, brand: input.brand });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// ── Template Integration ──

/**
 * Resolve the active template version layout for a given company + docType.
 * Returns null if no default template exists (fallback to hardcoded rendering).
 */
export async function getActiveTemplateLayout(
  companyId: string,
  docType: string,
): Promise<{ layout: TemplateLayout; versionId: string } | null> {
  const client = getPrisma();
  if (!client) return null;

  const template = await client.pdfTemplate
    .findFirst({
      where: { companyId, docType, isDefault: true },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    })
    .catch(() => null);

  if (!template || template.versions.length === 0) return null;

  const latest = template.versions[0];
  return { layout: latest.layout as unknown as TemplateLayout, versionId: latest.id };
}

/**
 * Try to render a PDF using the company's custom template.
 * Returns the PDF buffer on success, or null on failure (caller should fallback to hardcoded).
 */
export async function tryRenderWithTemplate(
  companyId: string,
  docType: string,
  data: Record<string, unknown>,
  brand?: BrandContext,
): Promise<Buffer | null> {
  try {
    const result = await getActiveTemplateLayout(companyId, docType);
    if (!result) return null;
    return await renderFromTemplate(result.layout, data, brand);
  } catch (e) {
    console.warn(`[pdf] Template render failed for ${docType}, falling back to hardcoded:`, e);
    return null;
  }
}
