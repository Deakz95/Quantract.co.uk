/**
 * PDF template constants for the certificate template editor.
 * Mirrors apps/crm/src/lib/pdfTemplateConstants.ts — certificate bindings only.
 */

export type LayoutElementType = "text" | "line" | "rect" | "table" | "image" | "signature" | "photo";

export const DOC_TYPE_BINDINGS: Record<string, string[]> = {
  certificate: [
    "companyName", "id", "certificateNumber", "certType", "status", "issuedAt",
    "jobReference", "siteName", "installationAddress", "clientName", "clientEmail", "jobDescription",
    "inspectorName", "inspectorEmail",
    "descriptionOfWork", "supplyType", "earthingArrangement", "distributionType", "maxDemand",
    "limitations", "observations", "nextInspectionDate",
    "overallAssessment", "recommendations",
    "extentOfWork", "worksTested", "declarationComments",
    "outcome", "outcomeReason",
    "engineerName", "engineerSignedAt", "customerName", "customerSignedAt",
    "footerLine1", "footerLine2", "contactDetails",
  ],
};

/**
 * Required bindings per certificate type.
 * Mirrors apps/crm/src/lib/pdfTemplateConstants.ts.
 */
export const CERT_TYPE_REQUIRED_BINDINGS: Record<string, string[]> = {
  _base: [
    "companyName", "certificateNumber", "certType", "status",
    "siteName", "clientName", "inspectorName",
    "descriptionOfWork", "supplyType", "earthingArrangement",
    "engineerName", "engineerSignedAt",
  ],
  EICR: ["overallAssessment"],
  EIC: ["extentOfWork", "worksTested"],
  MWC: ["extentOfWork"],
  Fire: ["extentOfWork"],
  EML: ["extentOfWork"],
};
