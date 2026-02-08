/**
 * Certificate Branding & Company Identity (CERT-A25)
 *
 * Types and pure functions for resolving branded certificate PDFs.
 * Handles company branding, legal entity overrides, and accreditation badges.
 * Used by both CRM (PDF generation) and offline certificates app (branding snapshot).
 */

// ─── Types ──────────────────────────────────────────────────────────

/** Known accreditation bodies for UK electrical contractors */
export type AccreditationBody =
  | "NICEIC"
  | "NAPIT"
  | "ELECSA"
  | "STROMA"
  | "OZEV"
  | "BRE"
  | "OTHER";

/** A single accreditation entry */
export interface AccreditationEntry {
  body: AccreditationBody;
  registrationNumber: string;
  /** Display name override (for "OTHER" type or custom label) */
  displayName?: string;
  /** Whether to show on certificate PDFs */
  showOnCertificates: boolean;
}

/** Full branding configuration for certificate PDFs */
export interface CertificateBrandingConfig {
  // Company identity
  companyName: string;
  tradingName?: string;
  tagline?: string;

  // Visual branding
  logoDataUrl?: string;
  primaryColor?: string;
  accentColor?: string;

  // Footer content
  footerLine1?: string;
  footerLine2?: string;
  contactDetails?: string;

  // Accreditation
  accreditations: AccreditationEntry[];

  // Legal entity override info (if different from company)
  legalEntityName?: string;
  companyNumber?: string;
  vatNumber?: string;
}

/** Company-level accreditation settings (stored in DB) */
export interface CompanyAccreditations {
  entries: AccreditationEntry[];
}

/** Input for resolving branding — matches what's available from DB */
export interface BrandingResolutionInput {
  company: {
    brandName: string;
    brandTagline?: string | null;
    themePrimary?: string | null;
    themeAccent?: string | null;
    pdfPrimaryColour?: string | null;
    pdfAccentColour?: string | null;
    pdfFooterLine1?: string | null;
    pdfFooterLine2?: string | null;
    pdfContactDetails?: string | null;
    accreditations?: string | null; // JSON string of CompanyAccreditations
  };
  legalEntity?: {
    displayName?: string | null;
    legalName?: string | null;
    companyNumber?: string | null;
    vatNumber?: string | null;
    pdfFooterLine1?: string | null;
    pdfFooterLine2?: string | null;
  } | null;
  logoDataUrl?: string | null;
}

// ─── Constants ──────────────────────────────────────────────────────

/** Display labels for known accreditation bodies */
export const ACCREDITATION_LABELS: Record<AccreditationBody, string> = {
  NICEIC: "NICEIC Approved Contractor",
  NAPIT: "NAPIT Registered Installer",
  ELECSA: "ELECSA Registered",
  STROMA: "Stroma Certified",
  OZEV: "OZEV Approved Installer",
  BRE: "BRE Certified",
  OTHER: "Other",
};

/** Short labels for PDF badge rendering */
export const ACCREDITATION_SHORT_LABELS: Record<AccreditationBody, string> = {
  NICEIC: "NICEIC",
  NAPIT: "NAPIT",
  ELECSA: "ELECSA",
  STROMA: "Stroma",
  OZEV: "OZEV",
  BRE: "BRE",
  OTHER: "",
};

// ─── Pure Functions ─────────────────────────────────────────────────

/**
 * Resolve branding configuration from company + optional legal entity.
 * Legal entity fields override company defaults where present.
 */
export function resolveBranding(input: BrandingResolutionInput): CertificateBrandingConfig {
  const { company, legalEntity, logoDataUrl } = input;

  // Parse accreditations from JSON string
  let accreditations: AccreditationEntry[] = [];
  if (company.accreditations) {
    try {
      const parsed = JSON.parse(company.accreditations) as CompanyAccreditations;
      accreditations = Array.isArray(parsed.entries) ? parsed.entries : [];
    } catch {
      // Invalid JSON — ignore
    }
  }

  return {
    companyName: company.brandName,
    tradingName: legalEntity?.displayName ?? undefined,
    tagline: company.brandTagline ?? undefined,
    logoDataUrl: logoDataUrl ?? undefined,
    primaryColor: company.pdfPrimaryColour ?? company.themePrimary ?? undefined,
    accentColor: company.pdfAccentColour ?? company.themeAccent ?? undefined,
    // Legal entity footer overrides company footer
    footerLine1: legalEntity?.pdfFooterLine1 ?? company.pdfFooterLine1 ?? undefined,
    footerLine2: legalEntity?.pdfFooterLine2 ?? company.pdfFooterLine2 ?? undefined,
    contactDetails: company.pdfContactDetails ?? undefined,
    accreditations: accreditations.filter((a) => a.showOnCertificates),
    legalEntityName: legalEntity?.legalName ?? undefined,
    companyNumber: legalEntity?.companyNumber ?? undefined,
    vatNumber: legalEntity?.vatNumber ?? undefined,
  };
}

/**
 * Format accreditation entries as a single line for PDF footer.
 * e.g. "NICEIC: 12345 | NAPIT: 67890"
 */
export function formatAccreditationLine(accreditations: AccreditationEntry[]): string {
  return accreditations
    .filter((a) => a.showOnCertificates && a.registrationNumber)
    .map((a) => {
      const label = a.displayName || ACCREDITATION_SHORT_LABELS[a.body] || a.body;
      return `${label}: ${a.registrationNumber}`;
    })
    .join(" | ");
}

/**
 * Build a flat branding data dictionary for PDF template bindings.
 * Keys are prefixed with "brand." for use in templates.
 */
export function buildBrandingBindings(config: CertificateBrandingConfig): Record<string, string> {
  const bindings: Record<string, string> = {
    brandCompanyName: config.companyName,
    brandTradingName: config.tradingName ?? "",
    brandTagline: config.tagline ?? "",
    brandFooterLine1: config.footerLine1 ?? "",
    brandFooterLine2: config.footerLine2 ?? "",
    brandContactDetails: config.contactDetails ?? "",
    brandLegalEntityName: config.legalEntityName ?? "",
    brandCompanyNumber: config.companyNumber ?? "",
    brandVatNumber: config.vatNumber ?? "",
    brandAccreditations: formatAccreditationLine(config.accreditations),
  };

  // Individual accreditation bindings
  for (const acc of config.accreditations) {
    const key = `accreditation${acc.body}`;
    bindings[key] = acc.registrationNumber;
  }

  return bindings;
}

/**
 * Parse accreditations JSON from DB. Returns empty array on failure.
 */
export function parseAccreditations(json: string | null | undefined): AccreditationEntry[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as CompanyAccreditations;
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
}

/**
 * Serialize accreditations to JSON for DB storage.
 */
export function serializeAccreditations(entries: AccreditationEntry[]): string {
  return JSON.stringify({ entries } satisfies CompanyAccreditations);
}

/**
 * Get display label for an accreditation entry.
 */
export function getAccreditationLabel(entry: AccreditationEntry): string {
  return entry.displayName || ACCREDITATION_LABELS[entry.body] || entry.body;
}
