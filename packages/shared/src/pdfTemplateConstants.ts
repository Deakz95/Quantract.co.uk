/**
 * Shared constants for PDF template editor (safe for both client and server).
 */

export type LayoutElementType = "text" | "line" | "rect" | "table" | "image" | "signature" | "photo";

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
    // Header
    "companyName", "id", "certificateNumber", "certType", "status", "issuedAt",
    // Overview
    "jobReference", "siteName", "installationAddress", "clientName", "clientEmail", "jobDescription",
    // Inspector
    "inspectorName", "inspectorEmail",
    // Installation
    "descriptionOfWork", "supplyType", "earthingArrangement", "distributionType", "maxDemand",
    // Inspection
    "limitations", "observations", "nextInspectionDate",
    // Assessment (EICR)
    "overallAssessment", "recommendations",
    // Declarations
    "extentOfWork", "worksTested", "declarationComments",
    // Outcome
    "outcome", "outcomeReason",
    // Signatures
    "engineerName", "engineerSignedAt", "customerName", "customerSignedAt",
    // Footer
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

/**
 * Required bindings per certificate type.
 * Used to validate that a certificate template includes all necessary fields.
 */
export const CERT_TYPE_REQUIRED_BINDINGS: Record<string, string[]> = {
  // Base requirements for all cert types
  _base: [
    "companyName", "certificateNumber", "certType", "status",
    "siteName", "clientName", "inspectorName",
    "descriptionOfWork", "supplyType", "earthingArrangement",
    "engineerName", "engineerSignedAt",
  ],
  // EICR additionally requires assessment
  EICR: ["overallAssessment"],
  // EIC — Electrical Installation Certificate
  EIC: ["extentOfWork", "worksTested"],
  // MWC — Minor Works Certificate
  MWC: ["extentOfWork"],
  // Fire alarm certificate
  Fire: ["extentOfWork"],
  // Emergency Lighting certificate
  EML: ["extentOfWork"],
};

/** Supported PDF font families (standard 14 PDF fonts available in pdf-lib) */
export const PDF_FONT_FAMILIES = ["Helvetica", "Courier", "TimesRoman"] as const;
export type PdfFontFamily = (typeof PDF_FONT_FAMILIES)[number];

/** Grouped bindings by section for the template editor UI */
export type BindingGroup = { label: string; bindings: string[] };

export const CERT_BINDING_GROUPS: BindingGroup[] = [
  { label: "Header", bindings: ["companyName", "id", "certificateNumber", "certType", "status", "issuedAt"] },
  { label: "Overview", bindings: ["jobReference", "siteName", "installationAddress", "clientName", "clientEmail", "jobDescription"] },
  { label: "Inspector", bindings: ["inspectorName", "inspectorEmail"] },
  { label: "Installation", bindings: ["descriptionOfWork", "supplyType", "earthingArrangement", "distributionType", "maxDemand"] },
  { label: "Inspection", bindings: ["limitations", "observations", "nextInspectionDate"] },
  { label: "Assessment", bindings: ["overallAssessment", "recommendations"] },
  { label: "Declarations", bindings: ["extentOfWork", "worksTested", "declarationComments"] },
  { label: "Outcome", bindings: ["outcome", "outcomeReason"] },
  { label: "Signatures", bindings: ["engineerName", "engineerSignedAt", "customerName", "customerSignedAt"] },
  { label: "Footer", bindings: ["footerLine1", "footerLine2", "contactDetails"] },
];

export const DOC_TYPE_BINDING_GROUPS: Record<string, BindingGroup[]> = {
  invoice: [
    { label: "Header", bindings: ["companyName", "id", "invoiceNumber", "createdAt", "paidAt"] },
    { label: "Client", bindings: ["clientName", "clientEmail"] },
    { label: "Totals", bindings: ["subtotal", "vat", "vatPercent", "total", "status"] },
    { label: "Footer", bindings: ["footerLine1", "footerLine2", "contactDetails"] },
  ],
  quote: [
    { label: "Header", bindings: ["companyName", "id", "createdAt", "acceptedAt"] },
    { label: "Client", bindings: ["clientName", "clientEmail", "siteAddress", "notes"] },
    { label: "Totals", bindings: ["subtotal", "vat", "vatPercent", "total", "status"] },
    { label: "Footer", bindings: ["footerLine1", "footerLine2", "contactDetails"] },
  ],
  certificate: CERT_BINDING_GROUPS,
  variation: [
    { label: "Header", bindings: ["companyName", "id", "status"] },
    { label: "Client", bindings: ["clientName", "reason"] },
    { label: "Totals", bindings: ["subtotal", "vat", "vatPercent", "total"] },
    { label: "Footer", bindings: ["footerLine1", "footerLine2", "contactDetails"] },
  ],
  receipt: [
    { label: "Header", bindings: ["companyName", "invoiceNumber", "receiptId", "paidAt"] },
    { label: "Client", bindings: ["clientName", "clientEmail"] },
    { label: "Payment", bindings: ["amount", "provider"] },
    { label: "Footer", bindings: ["footerLine1", "footerLine2", "contactDetails"] },
  ],
};

/**
 * Validate that a template layout includes all required bindings for the given cert type.
 * Returns { valid: true } or { valid: false, missing: string[] }.
 */
export function validateTemplateForCertType(
  layout: Array<{ type: string; binding?: string }>,
  certType: string,
): { valid: boolean; missing?: string[] } {
  const baseRequired = CERT_TYPE_REQUIRED_BINDINGS._base ?? [];
  const typeRequired = CERT_TYPE_REQUIRED_BINDINGS[certType] ?? [];
  const allRequired = [...baseRequired, ...typeRequired];

  // Collect all bindings referenced in the layout
  const usedBindings = new Set<string>();
  for (const el of layout) {
    if (el.binding) {
      // Extract binding keys from {{key}} patterns
      const matches = el.binding.matchAll(/\{\{(\w+)\}\}/g);
      for (const match of matches) {
        usedBindings.add(match[1]);
      }
    }
  }

  const missing = allRequired.filter((b) => !usedBindings.has(b));
  if (missing.length === 0) return { valid: true };
  return { valid: false, missing };
}
