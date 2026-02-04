/**
 * Shared constants for PDF template editor (safe for both client and server).
 */

export type LayoutElementType = "text" | "line" | "rect" | "table" | "image";

export const VALID_DOC_TYPES = ["invoice", "quote", "certificate", "variation", "receipt"] as const;

export const DOC_TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  quote: "Quote",
  certificate: "Certificate",
  variation: "Variation",
  receipt: "Receipt",
};

/** Available data bindings per doc type for the template editor */
export const DOC_TYPE_BINDINGS: Record<string, string[]> = {
  invoice: [
    "companyName", "id", "invoiceNumber", "createdAt", "paidAt",
    "clientName", "clientEmail", "subtotal", "vat", "vatPercent", "total", "status",
    "footerLine1", "footerLine2", "contactDetails",
  ],
  quote: [
    "companyName", "id", "createdAt", "acceptedAt",
    "clientName", "clientEmail", "siteAddress", "notes",
    "subtotal", "vat", "vatPercent", "total", "status",
    "footerLine1", "footerLine2", "contactDetails",
  ],
  certificate: [
    "companyName", "id", "certificateNumber", "certType", "status", "issuedAt",
    "siteName", "clientName", "inspectorName", "inspectorEmail",
    "footerLine1", "footerLine2", "contactDetails",
  ],
  variation: [
    "companyName", "id", "status", "clientName", "reason",
    "subtotal", "vat", "vatPercent", "total",
    "footerLine1", "footerLine2", "contactDetails",
  ],
  receipt: [
    "companyName", "invoiceNumber", "receiptId", "paidAt",
    "clientName", "clientEmail", "amount", "provider",
    "footerLine1", "footerLine2", "contactDetails",
  ],
};
