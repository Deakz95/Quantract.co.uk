/**
 * PDF Template Render Engine
 *
 * Renders PDF documents from a versioned layout definition (JSON).
 * Each layout is an array of elements positioned absolutely on an A4 page.
 *
 * Element types:
 *  - text: draws bound/static text
 *  - line: horizontal/vertical rule
 *  - rect: filled/stroked rectangle
 *  - table: tabular data with column definitions
 *  - image: company logo placeholder
 */

import { PDFDocument, StandardFonts } from "pdf-lib";
import type { BrandContext } from "@/lib/server/pdf";

// ── Types ──

export type LayoutElementType = "text" | "line" | "rect" | "table" | "image" | "signature" | "photo";

export interface LayoutElement {
  id: string;
  type: LayoutElementType;
  x: number; // mm from left
  y: number; // mm from top
  w: number; // mm width
  h: number; // mm height
  // text
  binding?: string; // e.g. "{{clientName}}", "{{invoiceNumber}}", or static text
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  color?: string; // hex
  align?: "left" | "center" | "right";
  // line
  lineColor?: string;
  lineThickness?: number;
  // rect
  fillColor?: string;
  strokeColor?: string;
  // table
  columns?: Array<{ header: string; binding: string; width: number }>;
  // image
  imageSource?: "logo" | "signature_engineer" | "signature_customer" | "photo";
  // signature block
  signatureRole?: "engineer" | "customer"; // which role this signature block shows
}

export type TemplateLayout = LayoutElement[];

// ── Validation ──

const MAX_ELEMENTS = 100;
const VALID_TYPES: LayoutElementType[] = ["text", "line", "rect", "table", "image", "signature", "photo"];

export function validateLayout(layout: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(layout)) return { valid: false, error: "Layout must be an array" };
  if (layout.length > MAX_ELEMENTS) return { valid: false, error: `Too many elements (max ${MAX_ELEMENTS})` };
  for (let i = 0; i < layout.length; i++) {
    const el = layout[i];
    if (!el || typeof el !== "object") return { valid: false, error: `Element ${i} is not an object` };
    if (!VALID_TYPES.includes(el.type)) return { valid: false, error: `Element ${i} has invalid type "${el.type}"` };
    if (typeof el.x !== "number" || typeof el.y !== "number") return { valid: false, error: `Element ${i} missing x/y` };
    if (typeof el.w !== "number" || typeof el.h !== "number") return { valid: false, error: `Element ${i} missing w/h` };
    // Bound reasonable ranges (A4 is 210x297mm)
    if (el.x < 0 || el.x > 210 || el.y < 0 || el.y > 297) return { valid: false, error: `Element ${i} position out of A4 bounds` };
    if (el.w < 0 || el.w > 210 || el.h < 0 || el.h > 297) return { valid: false, error: `Element ${i} size out of A4 bounds` };
    if (el.type === "table" && el.columns) {
      if (!Array.isArray(el.columns) || el.columns.length > 20) return { valid: false, error: `Element ${i} table columns invalid` };
    }
  }
  return { valid: true };
}

// ── Coordinate conversion ──

const MM_TO_PT = 2.83465; // 1mm = 2.83465pt
const A4_W_PT = 595.28;
const A4_H_PT = 841.89;

function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

/** Convert from layout coords (origin top-left, mm) to PDF coords (origin bottom-left, pt) */
function toPageY(yMm: number, heightMm: number): number {
  return A4_H_PT - mmToPt(yMm) - mmToPt(heightMm);
}

function hexToRgbValues(hex: string): any {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return { type: "RGB", red: 0, green: 0, blue: 0 };
  return { type: "RGB", red: r, green: g, blue: b };
}

const BLACK = { type: "RGB" as const, red: 0, green: 0, blue: 0 };

// ── Binding resolution ──

function resolveBinding(binding: string | undefined, data: Record<string, unknown>): string {
  if (!binding) return "";
  // Replace all {{key}} with data values
  return binding.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, key: string) => {
    const parts = key.split(".");
    let val: unknown = data;
    for (const part of parts) {
      if (val && typeof val === "object") {
        val = (val as Record<string, unknown>)[part];
      } else {
        val = undefined;
        break;
      }
    }
    if (val === undefined || val === null) return "";
    return String(val);
  });
}

function pounds(n: number): string {
  return `\u00A3${Number(n).toFixed(2)}`;
}

// ── Render Engine ──

/** Attachment images that can be embedded in template PDFs */
export type TemplateImageAttachments = {
  /** Engineer signature image bytes (PNG or JPG) */
  signatureEngineer?: Uint8Array | null;
  /** Customer signature image bytes (PNG or JPG) */
  signatureCustomer?: Uint8Array | null;
  /** Photo attachments (PNG or JPG), up to 5 */
  photos?: Uint8Array[];
};

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB cap per photo

async function embedImageSafe(
  doc: Awaited<ReturnType<typeof PDFDocument.create>>,
  bytes: Uint8Array,
): Promise<Awaited<ReturnType<typeof doc.embedPng>> | null> {
  if (!bytes || bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) return null;
  try {
    // Try PNG first, then JPG
    return await doc.embedPng(bytes);
  } catch {
    try {
      return await doc.embedJpg(bytes);
    } catch {
      return null;
    }
  }
}

export async function renderFromTemplate(
  layout: TemplateLayout,
  data: Record<string, unknown>,
  brand?: BrandContext | null,
  attachments?: TemplateImageAttachments | null,
): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([A4_W_PT, A4_H_PT]);

  // Embed logo if available
  let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
  if (brand?.logoPngBytes && brand.logoPngBytes.length > 0) {
    try {
      logoImage = await doc.embedPng(brand.logoPngBytes);
    } catch {
      // ignore logo embed failures
    }
  }

  // Pre-embed attachment images
  const embeddedAttachments: {
    signatureEngineer?: Awaited<ReturnType<typeof doc.embedPng>> | null;
    signatureCustomer?: Awaited<ReturnType<typeof doc.embedPng>> | null;
    photos: Array<Awaited<ReturnType<typeof doc.embedPng>>>;
  } = { photos: [] };
  if (attachments?.signatureEngineer) {
    embeddedAttachments.signatureEngineer = await embedImageSafe(doc, attachments.signatureEngineer);
  }
  if (attachments?.signatureCustomer) {
    embeddedAttachments.signatureCustomer = await embedImageSafe(doc, attachments.signatureCustomer);
  }
  if (attachments?.photos) {
    for (const photo of attachments.photos.slice(0, 5)) {
      const img = await embedImageSafe(doc, photo);
      if (img) embeddedAttachments.photos.push(img);
    }
  }

  for (const el of layout) {
    const xPt = mmToPt(el.x);
    const wPt = mmToPt(el.w);
    const hPt = mmToPt(el.h);
    const yPt = toPageY(el.y, el.h);

    switch (el.type) {
      case "text": {
        const resolved = resolveBinding(el.binding, data);
        if (!resolved) break;
        const usedFont = el.fontWeight === "bold" ? bold : font;
        const size = el.fontSize ?? 10;
        const color = el.color ? hexToRgbValues(el.color) : BLACK;
        // Simple alignment: left (default), center, right
        let drawX = xPt;
        if (el.align === "center") {
          const textWidth = usedFont.widthOfTextAtSize(resolved.slice(0, 120), size);
          drawX = xPt + (wPt - textWidth) / 2;
        } else if (el.align === "right") {
          const textWidth = usedFont.widthOfTextAtSize(resolved.slice(0, 120), size);
          drawX = xPt + wPt - textWidth;
        }
        // Draw at vertical center of the element box
        const textY = yPt + (hPt - size) / 2;
        page.drawText(resolved.slice(0, 200), { x: drawX, y: textY, size, font: usedFont, color });
        break;
      }
      case "line": {
        const color = el.lineColor ? hexToRgbValues(el.lineColor) : BLACK;
        const thickness = el.lineThickness ?? 1;
        const lineY = yPt + hPt / 2;
        page.drawLine({
          start: { x: xPt, y: lineY },
          end: { x: xPt + wPt, y: lineY },
          thickness,
          color,
        });
        break;
      }
      case "rect": {
        if (el.fillColor) {
          page.drawRectangle({
            x: xPt,
            y: yPt,
            width: wPt,
            height: hPt,
            color: hexToRgbValues(el.fillColor),
          });
        }
        if (el.strokeColor) {
          page.drawRectangle({
            x: xPt,
            y: yPt,
            width: wPt,
            height: hPt,
            borderColor: hexToRgbValues(el.strokeColor),
            borderWidth: el.lineThickness ?? 1,
          });
        }
        break;
      }
      case "table": {
        const columns = el.columns ?? [];
        if (columns.length === 0) break;
        const items = (data.items ?? data.lineItems ?? []) as Record<string, unknown>[];
        const rowHeight = 14;
        const headerSize = 9;
        const cellSize = 9;
        const usedBold = bold;
        const usedFont = font;
        let curY = yPt + hPt - rowHeight; // start at top of element

        // Header row
        let colX = xPt;
        for (const col of columns) {
          const colW = mmToPt(col.width);
          page.drawText(col.header.slice(0, 30), { x: colX + 2, y: curY + 3, size: headerSize, font: usedBold });
          colX += colW;
        }
        curY -= rowHeight;

        // Data rows
        const maxRows = Math.min(items.length, Math.floor((curY - yPt) / rowHeight));
        for (let i = 0; i < maxRows; i++) {
          const row = items[i];
          colX = xPt;
          for (const col of columns) {
            const colW = mmToPt(col.width);
            const val = resolveBinding(`{{${col.binding}}}`, row as Record<string, unknown>);
            page.drawText(val.slice(0, 50), { x: colX + 2, y: curY + 3, size: cellSize, font: usedFont });
            colX += colW;
          }
          curY -= rowHeight;
        }
        break;
      }
      case "image": {
        let imgToDraw: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
        if (el.imageSource === "logo") {
          imgToDraw = logoImage;
        } else if (el.imageSource === "signature_engineer") {
          imgToDraw = embeddedAttachments.signatureEngineer ?? null;
        } else if (el.imageSource === "signature_customer") {
          imgToDraw = embeddedAttachments.signatureCustomer ?? null;
        } else if (el.imageSource === "photo") {
          imgToDraw = embeddedAttachments.photos[0] ?? null;
        }
        if (imgToDraw) {
          const aspectRatio = imgToDraw.height / imgToDraw.width;
          const drawW = Math.min(wPt, mmToPt(el.imageSource === "logo" ? 40 : el.w));
          const drawH = Math.min(drawW * aspectRatio, hPt);
          page.drawImage(imgToDraw, { x: xPt, y: yPt + hPt - drawH, width: drawW, height: drawH });
        }
        break;
      }
      case "signature": {
        // Render a signature block: name + date label within a positioned box
        const role = el.signatureRole ?? "engineer";
        const nameKey = role === "engineer" ? "engineerName" : "customerName";
        const dateKey = role === "engineer" ? "engineerSignedAt" : "customerSignedAt";
        const name = String(data[nameKey] ?? "");
        const date = String(data[dateKey] ?? "");
        const roleLabel = role === "engineer" ? "Engineer" : "Customer";

        // Draw box outline
        page.drawRectangle({
          x: xPt,
          y: yPt,
          width: wPt,
          height: hPt,
          borderColor: BLACK,
          borderWidth: 0.5,
        });

        // Role label
        page.drawText(roleLabel, { x: xPt + 4, y: yPt + hPt - 12, size: 8, font: bold, color: BLACK });
        // Name
        if (name) {
          page.drawText(name.slice(0, 60), { x: xPt + 4, y: yPt + hPt - 24, size: 10, font, color: BLACK });
        }
        // Signed date
        if (date) {
          page.drawText(`Signed: ${date}`, { x: xPt + 4, y: yPt + 4, size: 7, font, color: BLACK });
        }

        // Embed signature image if available
        const sigImg = role === "engineer"
          ? embeddedAttachments.signatureEngineer
          : embeddedAttachments.signatureCustomer;
        if (sigImg) {
          const sigAspect = sigImg.height / sigImg.width;
          const sigW = Math.min(wPt - 8, mmToPt(30));
          const sigH = Math.min(sigW * sigAspect, hPt - 30);
          if (sigH > 5) {
            page.drawImage(sigImg, { x: xPt + 4, y: yPt + 14, width: sigW, height: sigH });
          }
        }
        break;
      }
      case "photo": {
        // Render first available photo attachment in the element box
        const photoImg = embeddedAttachments.photos[0] ?? null;
        if (photoImg) {
          const photoAspect = photoImg.height / photoImg.width;
          const drawW = Math.min(wPt, mmToPt(el.w));
          const drawH = Math.min(drawW * photoAspect, hPt);
          page.drawImage(photoImg, { x: xPt, y: yPt + hPt - drawH, width: drawW, height: drawH });
        } else {
          // Placeholder
          page.drawRectangle({
            x: xPt, y: yPt, width: wPt, height: hPt,
            borderColor: BLACK, borderWidth: 0.5,
          });
          page.drawText("[Photo]", { x: xPt + 4, y: yPt + hPt / 2, size: 8, font, color: BLACK });
        }
        break;
      }
    }
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// ── Default Layouts ──

/**
 * Returns a default layout that approximates the current hardcoded PDF output
 * for the given document type. Used as starting point for new templates.
 */
export function getDefaultLayout(docType: string): TemplateLayout {
  switch (docType) {
    case "invoice":
      return getInvoiceDefaultLayout();
    case "quote":
      return getQuoteDefaultLayout();
    case "certificate":
      return getCertificateDefaultLayout();
    case "variation":
      return getVariationDefaultLayout();
    case "receipt":
      return getReceiptDefaultLayout();
    default:
      return getInvoiceDefaultLayout();
  }
}

function getInvoiceDefaultLayout(): TemplateLayout {
  return [
    { id: "logo", type: "image", x: 15, y: 10, w: 40, h: 20, imageSource: "logo" },
    { id: "company", type: "text", x: 15, y: 32, w: 100, h: 8, binding: "{{companyName}}", fontSize: 16, fontWeight: "bold" },
    { id: "sep", type: "line", x: 15, y: 42, w: 180, h: 1, lineColor: "#16a34a", lineThickness: 0.75 },
    { id: "title", type: "text", x: 15, y: 46, w: 60, h: 8, binding: "Invoice", fontSize: 14, fontWeight: "bold" },
    { id: "invNo", type: "text", x: 15, y: 55, w: 100, h: 6, binding: "Invoice No: {{invoiceNumber}}", fontSize: 10 },
    { id: "invId", type: "text", x: 15, y: 61, w: 100, h: 6, binding: "Invoice ID: {{id}}", fontSize: 10 },
    { id: "created", type: "text", x: 15, y: 67, w: 100, h: 6, binding: "Created: {{createdAt}}", fontSize: 10 },
    { id: "billTo", type: "text", x: 15, y: 78, w: 60, h: 6, binding: "Bill To", fontSize: 11, fontWeight: "bold" },
    { id: "clientName", type: "text", x: 15, y: 85, w: 100, h: 6, binding: "{{clientName}}", fontSize: 11 },
    { id: "clientEmail", type: "text", x: 15, y: 91, w: 100, h: 6, binding: "{{clientEmail}}", fontSize: 11 },
    {
      id: "items", type: "table", x: 15, y: 104, w: 180, h: 100,
      columns: [
        { header: "Description", binding: "description", width: 100 },
        { header: "Qty", binding: "qty", width: 20 },
        { header: "Unit", binding: "unitPrice", width: 25 },
        { header: "Line", binding: "lineTotal", width: 25 },
      ],
    },
    { id: "subtotal", type: "text", x: 130, y: 210, w: 65, h: 6, binding: "Subtotal: {{subtotal}}", fontSize: 10, fontWeight: "bold", align: "right" },
    { id: "vat", type: "text", x: 130, y: 217, w: 65, h: 6, binding: "VAT ({{vatPercent}}%): {{vat}}", fontSize: 10, fontWeight: "bold", align: "right" },
    { id: "total", type: "text", x: 130, y: 225, w: 65, h: 8, binding: "Total: {{total}}", fontSize: 12, fontWeight: "bold", align: "right" },
    { id: "status", type: "text", x: 15, y: 238, w: 60, h: 6, binding: "Status: {{status}}", fontSize: 10, fontWeight: "bold" },
    { id: "footer1", type: "text", x: 15, y: 278, w: 180, h: 5, binding: "{{footerLine1}}", fontSize: 7, align: "center" },
    { id: "footer2", type: "text", x: 15, y: 283, w: 180, h: 5, binding: "{{footerLine2}}", fontSize: 7, align: "center" },
  ];
}

function getQuoteDefaultLayout(): TemplateLayout {
  return [
    { id: "logo", type: "image", x: 15, y: 10, w: 40, h: 20, imageSource: "logo" },
    { id: "company", type: "text", x: 15, y: 32, w: 100, h: 8, binding: "{{companyName}}", fontSize: 16, fontWeight: "bold" },
    { id: "sep", type: "line", x: 15, y: 42, w: 180, h: 1, lineColor: "#16a34a", lineThickness: 0.75 },
    { id: "title", type: "text", x: 15, y: 46, w: 60, h: 8, binding: "Quote", fontSize: 14, fontWeight: "bold" },
    { id: "quoteId", type: "text", x: 15, y: 55, w: 100, h: 6, binding: "Quote ID: {{id}}", fontSize: 10 },
    { id: "created", type: "text", x: 15, y: 61, w: 100, h: 6, binding: "Created: {{createdAt}}", fontSize: 10 },
    { id: "clientLabel", type: "text", x: 15, y: 72, w: 60, h: 6, binding: "Client", fontSize: 11, fontWeight: "bold" },
    { id: "clientName", type: "text", x: 15, y: 79, w: 100, h: 6, binding: "{{clientName}}", fontSize: 11 },
    { id: "clientEmail", type: "text", x: 15, y: 85, w: 100, h: 6, binding: "{{clientEmail}}", fontSize: 11 },
    { id: "siteAddress", type: "text", x: 15, y: 91, w: 100, h: 6, binding: "{{siteAddress}}", fontSize: 11 },
    {
      id: "items", type: "table", x: 15, y: 104, w: 180, h: 100,
      columns: [
        { header: "Description", binding: "description", width: 110 },
        { header: "Qty", binding: "qty", width: 25 },
        { header: "Line", binding: "lineTotal", width: 35 },
      ],
    },
    { id: "subtotal", type: "text", x: 130, y: 210, w: 65, h: 6, binding: "Subtotal: {{subtotal}}", fontSize: 10, fontWeight: "bold", align: "right" },
    { id: "vat", type: "text", x: 130, y: 217, w: 65, h: 6, binding: "VAT ({{vatPercent}}%): {{vat}}", fontSize: 10, fontWeight: "bold", align: "right" },
    { id: "total", type: "text", x: 130, y: 225, w: 65, h: 8, binding: "Total: {{total}}", fontSize: 12, fontWeight: "bold", align: "right" },
    { id: "footer1", type: "text", x: 15, y: 278, w: 180, h: 5, binding: "{{footerLine1}}", fontSize: 7, align: "center" },
    { id: "footer2", type: "text", x: 15, y: 283, w: 180, h: 5, binding: "{{footerLine2}}", fontSize: 7, align: "center" },
  ];
}

function getCertificateDefaultLayout(): TemplateLayout {
  return [
    { id: "logo", type: "image", x: 15, y: 10, w: 40, h: 20, imageSource: "logo" },
    { id: "company", type: "text", x: 15, y: 32, w: 100, h: 8, binding: "{{companyName}}", fontSize: 16, fontWeight: "bold" },
    { id: "sep", type: "line", x: 15, y: 42, w: 180, h: 1, lineColor: "#16a34a", lineThickness: 0.75 },
    { id: "title", type: "text", x: 15, y: 46, w: 120, h: 8, binding: "{{certType}} Certificate", fontSize: 14, fontWeight: "bold" },
    { id: "certNo", type: "text", x: 15, y: 55, w: 100, h: 6, binding: "Certificate No: {{certificateNumber}}", fontSize: 10 },
    { id: "certId", type: "text", x: 15, y: 61, w: 100, h: 6, binding: "Certificate ID: {{id}}", fontSize: 10 },
    { id: "status", type: "text", x: 15, y: 67, w: 60, h: 6, binding: "Status: {{status}}", fontSize: 10 },
    { id: "issued", type: "text", x: 15, y: 73, w: 100, h: 6, binding: "Issued: {{issuedAt}}", fontSize: 10 },
    // Overview
    { id: "overview", type: "text", x: 15, y: 84, w: 60, h: 6, binding: "Overview", fontSize: 11, fontWeight: "bold" },
    { id: "site", type: "text", x: 15, y: 91, w: 100, h: 6, binding: "Site: {{siteName}}", fontSize: 10 },
    { id: "address", type: "text", x: 15, y: 97, w: 100, h: 6, binding: "Address: {{installationAddress}}", fontSize: 10 },
    { id: "client", type: "text", x: 15, y: 103, w: 100, h: 6, binding: "Client: {{clientName}}", fontSize: 10 },
    { id: "jobDesc", type: "text", x: 15, y: 109, w: 180, h: 6, binding: "{{jobDescription}}", fontSize: 10 },
    // Inspector
    { id: "inspector", type: "text", x: 15, y: 119, w: 60, h: 6, binding: "Inspector", fontSize: 11, fontWeight: "bold" },
    { id: "inspectorName", type: "text", x: 15, y: 126, w: 100, h: 6, binding: "{{inspectorName}}", fontSize: 10 },
    // Installation
    { id: "instLabel", type: "text", x: 15, y: 136, w: 60, h: 6, binding: "Installation", fontSize: 11, fontWeight: "bold" },
    { id: "descWork", type: "text", x: 15, y: 143, w: 180, h: 6, binding: "Work: {{descriptionOfWork}}", fontSize: 10 },
    { id: "supply", type: "text", x: 15, y: 149, w: 100, h: 6, binding: "Supply: {{supplyType}}", fontSize: 10 },
    { id: "earthing", type: "text", x: 15, y: 155, w: 100, h: 6, binding: "Earthing: {{earthingArrangement}}", fontSize: 10 },
    // Assessment
    { id: "assessLabel", type: "text", x: 15, y: 165, w: 60, h: 6, binding: "Assessment", fontSize: 11, fontWeight: "bold" },
    { id: "assessment", type: "text", x: 15, y: 172, w: 180, h: 6, binding: "{{overallAssessment}}", fontSize: 10 },
    // Outcome
    { id: "outcomeLabel", type: "text", x: 15, y: 182, w: 60, h: 6, binding: "Outcome", fontSize: 11, fontWeight: "bold" },
    { id: "outcome", type: "text", x: 15, y: 189, w: 80, h: 6, binding: "{{outcome}}", fontSize: 10, fontWeight: "bold" },
    { id: "outcomeReason", type: "text", x: 95, y: 189, w: 100, h: 6, binding: "{{outcomeReason}}", fontSize: 9 },
    // Signatures
    { id: "engSig", type: "signature", x: 15, y: 200, w: 85, h: 35, signatureRole: "engineer" },
    { id: "custSig", type: "signature", x: 110, y: 200, w: 85, h: 35, signatureRole: "customer" },
    // Footer
    { id: "footer1", type: "text", x: 15, y: 278, w: 180, h: 5, binding: "{{footerLine1}}", fontSize: 7, align: "center" },
    { id: "footer2", type: "text", x: 15, y: 283, w: 180, h: 5, binding: "{{footerLine2}}", fontSize: 7, align: "center" },
  ];
}

function getVariationDefaultLayout(): TemplateLayout {
  return [
    { id: "logo", type: "image", x: 15, y: 10, w: 40, h: 20, imageSource: "logo" },
    { id: "company", type: "text", x: 15, y: 32, w: 100, h: 8, binding: "{{companyName}}", fontSize: 16, fontWeight: "bold" },
    { id: "sep", type: "line", x: 15, y: 42, w: 180, h: 1, lineColor: "#16a34a", lineThickness: 0.75 },
    { id: "title", type: "text", x: 15, y: 46, w: 60, h: 8, binding: "Variation", fontSize: 14, fontWeight: "bold" },
    { id: "varId", type: "text", x: 15, y: 55, w: 100, h: 6, binding: "Variation ID: {{id}}", fontSize: 10 },
    { id: "status", type: "text", x: 15, y: 61, w: 60, h: 6, binding: "Status: {{status}}", fontSize: 10 },
    { id: "clientLabel", type: "text", x: 15, y: 72, w: 60, h: 6, binding: "Client", fontSize: 11, fontWeight: "bold" },
    { id: "clientName", type: "text", x: 15, y: 79, w: 100, h: 6, binding: "{{clientName}}", fontSize: 11 },
    {
      id: "items", type: "table", x: 15, y: 95, w: 180, h: 100,
      columns: [
        { header: "Description", binding: "description", width: 110 },
        { header: "Qty", binding: "qty", width: 25 },
        { header: "Line", binding: "lineTotal", width: 35 },
      ],
    },
    { id: "subtotal", type: "text", x: 130, y: 200, w: 65, h: 6, binding: "Subtotal: {{subtotal}}", fontSize: 10, fontWeight: "bold", align: "right" },
    { id: "vat", type: "text", x: 130, y: 207, w: 65, h: 6, binding: "VAT ({{vatPercent}}%): {{vat}}", fontSize: 10, fontWeight: "bold", align: "right" },
    { id: "total", type: "text", x: 130, y: 215, w: 65, h: 8, binding: "Total: {{total}}", fontSize: 12, fontWeight: "bold", align: "right" },
    { id: "footer1", type: "text", x: 15, y: 278, w: 180, h: 5, binding: "{{footerLine1}}", fontSize: 7, align: "center" },
    { id: "footer2", type: "text", x: 15, y: 283, w: 180, h: 5, binding: "{{footerLine2}}", fontSize: 7, align: "center" },
  ];
}

function getReceiptDefaultLayout(): TemplateLayout {
  return [
    { id: "logo", type: "image", x: 15, y: 10, w: 40, h: 20, imageSource: "logo" },
    { id: "company", type: "text", x: 15, y: 32, w: 100, h: 8, binding: "{{companyName}}", fontSize: 16, fontWeight: "bold" },
    { id: "sep", type: "line", x: 15, y: 42, w: 180, h: 1, lineColor: "#16a34a", lineThickness: 0.75 },
    { id: "title", type: "text", x: 15, y: 46, w: 80, h: 8, binding: "Payment Receipt", fontSize: 14, fontWeight: "bold" },
    { id: "invNo", type: "text", x: 15, y: 55, w: 100, h: 6, binding: "Invoice No: {{invoiceNumber}}", fontSize: 10 },
    { id: "receiptId", type: "text", x: 15, y: 61, w: 100, h: 6, binding: "Receipt ID: {{receiptId}}", fontSize: 10 },
    { id: "paidAt", type: "text", x: 15, y: 67, w: 100, h: 6, binding: "Paid at: {{paidAt}}", fontSize: 10 },
    { id: "paidBy", type: "text", x: 15, y: 78, w: 60, h: 6, binding: "Paid By", fontSize: 11, fontWeight: "bold" },
    { id: "clientName", type: "text", x: 15, y: 85, w: 100, h: 6, binding: "{{clientName}}", fontSize: 11 },
    { id: "amount", type: "text", x: 15, y: 98, w: 80, h: 8, binding: "Amount: {{amount}}", fontSize: 12, fontWeight: "bold" },
    { id: "provider", type: "text", x: 15, y: 107, w: 100, h: 6, binding: "Provider: {{provider}}", fontSize: 10 },
    { id: "footer1", type: "text", x: 15, y: 278, w: 180, h: 5, binding: "{{footerLine1}}", fontSize: 7, align: "center" },
    { id: "footer2", type: "text", x: 15, y: 283, w: 180, h: 5, binding: "{{footerLine2}}", fontSize: 7, align: "center" },
  ];
}

// Re-export shared constants for convenience
export { DOC_TYPE_BINDINGS } from "@/lib/pdfTemplateConstants";
