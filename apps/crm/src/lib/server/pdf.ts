type PDFPage = any;
import { PDFDocument as PDFDocumentFactory, StandardFonts } from "pdf-lib";
import type { Agreement, Quote, Invoice, Certificate, CertificateTestResult, Client, Site, Variation } from "@/lib/server/db";
import { quoteTotals } from "@/lib/server/db";
import { normalizeCertificateData, signatureIsPresent } from "@/lib/certificates";

export type BrandContext = {
  name: string;
  tagline?: string | null;
  logoPngBytes?: Uint8Array | null;
};

type PdfPage = PDFPage;

type PdfFont = unknown;
type PdfDocument = Awaited<ReturnType<typeof PDFDocumentFactory.create>>;

const DEFAULT_BRAND: BrandContext = {
  name: process.env.QT_BRAND_NAME || "Quantract",
  tagline: process.env.QT_BRAND_TAGLINE || null,
  logoPngBytes: null,
};

function pounds(n: number) {
  return `£${n.toFixed(2)}`;
}

async function newDoc() {
  const doc = await PDFDocumentFactory.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  return { doc, font, bold };
}

async function drawBrandHeader(args: {
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

  page.drawText(String(b.name || "").toUpperCase(), { x: left, y, size: 18, font: bold });
  y -= 24;
  if (b.tagline) {
    page.drawText(String(b.tagline), { x: left, y, size: 10, font });
    y -= 18;
  }
  return y;
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

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

export async function renderAgreementPdf(a: Agreement) {
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


export async function renderInvoicePdf(inv: Invoice, brand?: BrandContext) {
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
  line("Invoice", { size: 14, bold: true });
  y -= 6;
  if ((inv as any).invoiceNumber) line(`Invoice No: ${(inv as any).invoiceNumber}`, { size: 10 });
  if (inv.invoiceNumber) {
    line(`Invoice No: ${inv.invoiceNumber}`, { size: 10 });
  }
  line(`Invoice ID: ${inv.id}`, { size: 10 });
  line(`Created: ${new Date(inv.createdAtISO).toLocaleString("en-GB")}`, { size: 10 });
  if (inv.status === "paid" && inv.paidAtISO) line(`Paid: ${new Date(inv.paidAtISO).toLocaleString("en-GB")}`, { size: 10 });
  y -= 10;

  line("Bill To", { bold: true });
  line(inv.clientName);
  line(inv.clientEmail);
  y -= 12;

  line("Summary", { bold: true });
  line(`Subtotal: ${pounds(inv.subtotal)}`, { size: 11 });
  line(`VAT: ${pounds(inv.vat)}`, { size: 11 });
  line(`Total: ${pounds(inv.total)}`, { size: 12, bold: true });

  y -= 10;
  line(`Status: ${inv.status.toUpperCase()}`, { size: 10, bold: true });
  if (inv.quoteId) line(`Linked quote: ${inv.quoteId}`, { size: 10 });

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

  const bytes = await doc.save();
  return Buffer.from(bytes);
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

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
