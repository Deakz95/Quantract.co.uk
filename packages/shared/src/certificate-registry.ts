/**
 * Certificate Type Registry — Config-Driven Type System (CERT-A13)
 *
 * Every certificate type is defined as DATA:
 *  - Which sections it includes
 *  - Which fields are required for completion
 *  - Which signatures are needed
 *  - Which features/capabilities it has
 *
 * Validation, form rendering, and PDF generation can all be driven
 * from this registry rather than per-type switch statements.
 */

import type { CertificateType } from "./certificate-types";
import type { CertificateReviewConfig } from "./certificate-review";

// ── Section definition ──

export interface CertificateSectionConfig {
  /** Matches the section IDs used in form pages (e.g. "overview", "boards") */
  id: string;
  /** Display label shown in nav/tabs */
  label: string;
  /** Whether this section must be filled for completion */
  required: boolean;
  /** Help text / description */
  description?: string;
}

// ── Validation rule types ──

export type ValidationRule =
  | { kind: "required"; path: string; label: string; section: string }
  | { kind: "requiredTrue"; path: string; label: string; section: string }
  | {
      kind: "oneOf";
      paths: string[];
      label: string;
      section: string;
    }
  | {
      kind: "minArray";
      path: string;
      min: number;
      label: string;
      section: string;
    }
  | {
      kind: "signature";
      path: string;
      label: string;
      section: string;
      /** Fallback: if this path has a non-empty string, treat signature as present */
      fallbackNamePath?: string;
    }
  | {
      kind: "custom";
      /** Well-known check identifier (resolved by the validator) */
      check: string;
      label: string;
      section: string;
    };

// ── Signature definition ──

export interface CertificateSignatureConfig {
  /** Role identifier: "inspector", "designer", "installer", "engineer", "client" */
  role: string;
  /** Display label */
  label: string;
  /** Required for completion */
  required: boolean;
  /** Data path to the signature object */
  dataPath: string;
}

// ── Feature flags ──

export interface CertificateFeatures {
  hasBoards: boolean;
  hasInspectionChecklist: boolean;
  hasObservations: boolean;
  hasTestInstruments: boolean;
  hasOverallCondition: boolean;
  hasRetestDate: boolean;
  hasExtentAndLimitations: boolean;
  hasCircuitDetails: boolean;
  hasTestResults: boolean;
  hasDesignSection: boolean;
  hasClientAcknowledgement: boolean;
  hasSummaryOfCondition: boolean;
  hasPhotos: boolean;
}

// ── Full type config ──

export interface CertificateTypeConfig {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  standard: string;
  category: "electrical" | "fire" | "emergency" | "solar" | "other";
  /** Ordered list of form sections for this type */
  sections: CertificateSectionConfig[];
  /** Validation rules checked at completion time */
  validationRules: ValidationRule[];
  /** Signature blocks needed */
  signatures: CertificateSignatureConfig[];
  /** Feature flags controlling which UI components to show */
  features: CertificateFeatures;
  /** Review/approval config (CERT-A20) — omit or set required:false to skip review */
  review?: CertificateReviewConfig;
}

// ── Validation result ──

export type RegistryValidationError = {
  section: string;
  field: string;
  message: string;
};

export type RegistryValidationResult = {
  ok: boolean;
  missing: string[];
  errors: RegistryValidationError[];
  completionPercent: number;
};

// ════════════════════════════════════════════════════════
// Feature flag presets
// ════════════════════════════════════════════════════════

const ELECTRICAL_FEATURES: CertificateFeatures = {
  hasBoards: true,
  hasInspectionChecklist: false,
  hasObservations: true,
  hasTestInstruments: false,
  hasOverallCondition: false,
  hasRetestDate: true,
  hasExtentAndLimitations: false,
  hasCircuitDetails: false,
  hasTestResults: true,
  hasDesignSection: false,
  hasClientAcknowledgement: false,
  hasSummaryOfCondition: false,
  hasPhotos: true,
};

const SIMPLE_CERT_FEATURES: CertificateFeatures = {
  hasBoards: false,
  hasInspectionChecklist: false,
  hasObservations: true,
  hasTestInstruments: false,
  hasOverallCondition: true,
  hasRetestDate: true,
  hasExtentAndLimitations: false,
  hasCircuitDetails: false,
  hasTestResults: true,
  hasDesignSection: false,
  hasClientAcknowledgement: false,
  hasSummaryOfCondition: false,
  hasPhotos: true,
};

// ════════════════════════════════════════════════════════
// Common validation rules (reusable across types)
// ════════════════════════════════════════════════════════

const RULE_CLIENT_NAME: ValidationRule = {
  kind: "required",
  path: "overview.clientName",
  label: "client name",
  section: "overview",
};

const RULE_ADDRESS: ValidationRule = {
  kind: "required",
  path: "overview.installationAddress",
  label: "installation address",
  section: "overview",
};

const RULE_CONTRACTOR: ValidationRule = {
  kind: "required",
  path: "contractorDetails.companyName",
  label: "contractor company name",
  section: "contractorDetails",
};

const RULE_SUPPLY: ValidationRule = {
  kind: "oneOf",
  paths: [
    "supplyCharacteristics.systemType",
    "supplyCharacteristics.numberOfPhases",
    "installation.supplyType",
  ],
  label: "supply details",
  section: "supply",
};

const RULE_EARTHING: ValidationRule = {
  kind: "oneOf",
  paths: [
    "earthingArrangements.meansOfEarthing",
    "earthingArrangements.earthingConductorType",
    "installation.earthingArrangement",
  ],
  label: "earthing arrangement",
  section: "earthing",
};

const RULE_HAS_BOARD: ValidationRule = {
  kind: "minArray",
  path: "boards",
  min: 1,
  label: "at least one distribution board",
  section: "boards",
};

const RULE_HAS_CIRCUIT: ValidationRule = {
  kind: "custom",
  check: "boardsHaveCircuit",
  label: "at least one circuit on a board",
  section: "boards",
};

const RULE_ALL_CIRCUITS_STATUS: ValidationRule = {
  kind: "custom",
  check: "allCircuitsHaveStatus",
  label: "circuit status for all circuits",
  section: "boards",
};

// NOTE: RULE_OVERALL_CONDITION and RULE_RETEST_DATE are NOT shared constants
// because their `section` field varies by cert type. Each type inlines them
// with the correct section ID to enable per-step validation.

const RULE_INSPECTOR_SIGNATURE: ValidationRule = {
  kind: "signature",
  path: "declaration.inspectorSignature",
  label: "inspector signature",
  section: "declaration",
  fallbackNamePath: "declarationDetails.inspectorName",
};

const RULE_ENGINEER_SIGNATURE: ValidationRule = {
  kind: "signature",
  path: "signatures.engineer",
  label: "engineer signature",
  section: "declaration",
};

const RULE_CUSTOMER_SIGNATURE: ValidationRule = {
  kind: "signature",
  path: "signatures.customer",
  label: "customer signature",
  section: "declaration",
};

// ════════════════════════════════════════════════════════
// THE REGISTRY
// ════════════════════════════════════════════════════════

export const CERTIFICATE_TYPE_REGISTRY: Record<
  CertificateType,
  CertificateTypeConfig
> = {
  // ── EIC ──
  EIC: {
    id: "EIC",
    name: "Electrical Installation Certificate",
    shortName: "EIC",
    description:
      "For new installations or additions/alterations to existing installations",
    icon: "certificate",
    standard: "BS 7671:2018+A2:2022",
    category: "electrical",
    sections: [
      { id: "contractorDetails", label: "Contractor Details", required: true },
      { id: "overview", label: "Installation Details", required: true },
      { id: "supply", label: "Supply Characteristics", required: true },
      { id: "earthing", label: "Earthing Arrangements", required: true },
      {
        id: "originParticulars",
        label: "Particulars of Installation at Origin",
        required: false,
      },
      { id: "design", label: "Design", required: true },
      { id: "construction", label: "Construction", required: true },
      {
        id: "inspection",
        label: "Inspection & Testing",
        required: true,
      },
      {
        id: "comments",
        label: "Comments on Existing Installation",
        required: false,
        description: "Required for additions/alterations only",
      },
      { id: "boards", label: "Distribution Boards", required: true },
      { id: "observations", label: "Observations", required: false },
      { id: "nextInspection", label: "Next Inspection", required: true },
      { id: "declaration", label: "Declaration", required: true },
      { id: "photos", label: "Site Photos", required: false },
    ],
    validationRules: [
      RULE_CLIENT_NAME,
      RULE_ADDRESS,
      RULE_CONTRACTOR,
      RULE_SUPPLY,
      RULE_EARTHING,
      RULE_HAS_BOARD,
      RULE_HAS_CIRCUIT,
      RULE_ALL_CIRCUITS_STATUS,
      {
        kind: "oneOf",
        paths: [
          "recommendedRetestDate",
          "nextInspectionDate",
          "inspection.nextInspectionDate",
        ],
        label: "retest / next inspection date",
        section: "nextInspection",
      },
      {
        kind: "oneOf",
        paths: [
          "overview.jobDescription",
          "installation.descriptionOfWork",
          "installationType",
        ],
        label: "work description",
        section: "overview",
      },
      {
        kind: "custom",
        check: "eicDesignerDetails",
        label: "designer details",
        section: "design",
      },
      RULE_INSPECTOR_SIGNATURE,
    ],
    signatures: [
      {
        role: "designer",
        label: "Designer",
        required: true,
        dataPath: "designSection.signature",
      },
      {
        role: "installer",
        label: "Constructor",
        required: true,
        dataPath: "constructionSection.signature",
      },
      {
        role: "inspector",
        label: "Inspector",
        required: true,
        dataPath: "inspectionSection.signature",
      },
    ],
    features: {
      ...ELECTRICAL_FEATURES,
      hasDesignSection: true,
    },
    review: { required: true, rolesAllowedToReview: ["admin", "office"] },
  },

  // ── EICR ──
  EICR: {
    id: "EICR",
    name: "Electrical Installation Condition Report",
    shortName: "EICR",
    description:
      "For periodic inspection and testing of existing installations",
    icon: "clipboard",
    standard: "BS 7671:2018+A2:2022",
    category: "electrical",
    sections: [
      { id: "contractorDetails", label: "Contractor Details", required: true },
      { id: "overview", label: "Installation Details", required: true },
      {
        id: "extentAndLimitations",
        label: "Extent & Limitations",
        required: true,
      },
      { id: "supply", label: "Supply Characteristics", required: true },
      { id: "earthing", label: "Earthing Arrangements", required: true },
      {
        id: "generalInspection",
        label: "General Inspection",
        required: false,
      },
      { id: "boards", label: "Distribution Boards", required: true },
      { id: "observations", label: "Observations", required: false },
      {
        id: "summaryOfCondition",
        label: "Summary of Condition",
        required: false,
      },
      {
        id: "overallAssessment",
        label: "Overall Assessment",
        required: true,
      },
      { id: "declaration", label: "Declaration", required: true },
      {
        id: "clientAcknowledgement",
        label: "Client Acknowledgement",
        required: false,
      },
      { id: "photos", label: "Site Photos", required: false },
    ],
    validationRules: [
      RULE_CLIENT_NAME,
      RULE_ADDRESS,
      RULE_CONTRACTOR,
      RULE_SUPPLY,
      RULE_EARTHING,
      RULE_HAS_BOARD,
      RULE_HAS_CIRCUIT,
      RULE_ALL_CIRCUITS_STATUS,
      {
        kind: "oneOf",
        paths: ["overallCondition", "assessment.overallAssessment"],
        label: "overall condition assessment",
        section: "overallAssessment",
      },
      {
        kind: "oneOf",
        paths: [
          "recommendedRetestDate",
          "nextInspectionDate",
          "inspection.nextInspectionDate",
        ],
        label: "retest date",
        section: "overallAssessment",
      },
      RULE_INSPECTOR_SIGNATURE,
    ],
    signatures: [
      {
        role: "inspector",
        label: "Inspector",
        required: true,
        dataPath: "declaration.inspectorSignature",
      },
      {
        role: "client",
        label: "Client",
        required: false,
        dataPath: "clientAcknowledgement.clientSignature",
      },
    ],
    features: {
      ...ELECTRICAL_FEATURES,
      hasInspectionChecklist: true,
      hasTestInstruments: true,
      hasOverallCondition: true,
      hasExtentAndLimitations: true,
      hasClientAcknowledgement: true,
      hasSummaryOfCondition: true,
    },
    review: { required: true, rolesAllowedToReview: ["admin", "office"] },
  },

  // ── MWC ──
  MWC: {
    id: "MWC",
    name: "Minor Electrical Installation Works Certificate",
    shortName: "MWC",
    description: "For minor works that do not require a new circuit",
    icon: "edit",
    standard: "BS 7671:2018+A2:2022",
    category: "electrical",
    sections: [
      { id: "contractorDetails", label: "Contractor Details", required: true },
      { id: "overview", label: "Installation Details", required: true },
      { id: "workDescription", label: "Description of Works", required: true },
      { id: "circuitDetails", label: "Circuit Details", required: true },
      { id: "testResults", label: "Test Results", required: true },
      { id: "observations", label: "Observations", required: false },
      { id: "declaration", label: "Declaration", required: true },
      { id: "nextInspection", label: "Next Inspection", required: false },
      { id: "photos", label: "Site Photos", required: false },
    ],
    validationRules: [
      RULE_CLIENT_NAME,
      RULE_ADDRESS,
      RULE_CONTRACTOR,
      {
        kind: "oneOf",
        paths: [
          "workDescription",
          "overview.jobDescription",
          "installation.descriptionOfWork",
        ],
        label: "work description",
        section: "workDescription",
      },
      {
        kind: "oneOf",
        paths: [
          "circuitDetails.circuitReference",
          "circuitDetails.circuitAffected",
        ],
        label: "circuit reference",
        section: "circuitDetails",
      },
      {
        kind: "oneOf",
        paths: [
          "testResults.continuity",
          "testResults.continuityOfProtectiveConductors",
        ],
        label: "continuity test result",
        section: "testResults",
      },
      {
        kind: "oneOf",
        paths: [
          "testResults.insulationResistance",
          "testResults.insulationResistanceLE",
          "testResults.insulationResistanceLN",
        ],
        label: "insulation resistance test result",
        section: "testResults",
      },
      {
        kind: "requiredTrue",
        path: "testResults.polarityConfirmed",
        label: "polarity confirmation",
        section: "testResults",
      },
    ],
    signatures: [
      {
        role: "installer",
        label: "Installer",
        required: true,
        dataPath: "declaration.installerSignature",
      },
    ],
    features: {
      ...ELECTRICAL_FEATURES,
      hasBoards: false,
      hasCircuitDetails: true,
    },
    review: { required: true, rolesAllowedToReview: ["admin", "office"] },
  },

  // ── FIRE ──
  FIRE: {
    id: "FIRE",
    name: "Fire Alarm System Certificate",
    shortName: "Fire",
    description:
      "For fire alarm installation, commissioning, and servicing (BS 5839)",
    icon: "flame",
    standard: "BS 5839-1",
    category: "fire",
    sections: [
      { id: "contractorDetails", label: "Contractor Details", required: true },
      { id: "overview", label: "Installation Details", required: true },
      { id: "systemDetails", label: "System Details", required: true },
      { id: "devices", label: "Devices", required: false },
      { id: "testResults", label: "Test Results", required: true },
      { id: "observations", label: "Observations", required: false },
      {
        id: "overallCondition",
        label: "Overall Condition",
        required: true,
      },
      { id: "declaration", label: "Declaration", required: true },
      { id: "photos", label: "Site Photos", required: false },
    ],
    validationRules: [
      RULE_CLIENT_NAME,
      RULE_ADDRESS,
      RULE_CONTRACTOR,
      {
        kind: "oneOf",
        paths: ["overallCondition", "assessment.overallAssessment"],
        label: "overall condition assessment",
        section: "overallCondition",
      },
      {
        kind: "oneOf",
        paths: ["nextServiceDate", "nextInspectionDate"],
        label: "next service date",
        section: "overallCondition",
      },
      RULE_ENGINEER_SIGNATURE,
      RULE_CUSTOMER_SIGNATURE,
    ],
    signatures: [
      {
        role: "engineer",
        label: "Engineer",
        required: true,
        dataPath: "declaration.engineerSignature",
      },
      {
        role: "client",
        label: "Client",
        required: true,
        dataPath: "signatures.customer",
      },
    ],
    features: {
      ...SIMPLE_CERT_FEATURES,
    },
    review: { required: true, rolesAllowedToReview: ["admin", "office"] },
  },

  // ── EML ──
  EML: {
    id: "EML",
    name: "Emergency Lighting Certificate",
    shortName: "EML",
    description:
      "For emergency lighting installation and testing (BS 5266)",
    icon: "lightbulb",
    standard: "BS 5266-1",
    category: "emergency",
    sections: [
      { id: "contractorDetails", label: "Contractor Details", required: true },
      { id: "overview", label: "Installation Details", required: true },
      { id: "systemDetails", label: "System Details", required: true },
      { id: "luminaires", label: "Luminaires", required: false },
      { id: "testResults", label: "Test Results", required: true },
      { id: "observations", label: "Observations", required: false },
      {
        id: "overallCondition",
        label: "Overall Condition",
        required: true,
      },
      { id: "declaration", label: "Declaration", required: true },
      { id: "photos", label: "Site Photos", required: false },
    ],
    validationRules: [
      RULE_CLIENT_NAME,
      RULE_ADDRESS,
      RULE_CONTRACTOR,
      {
        kind: "oneOf",
        paths: ["overallCondition", "assessment.overallAssessment"],
        label: "overall condition assessment",
        section: "overallCondition",
      },
      {
        kind: "oneOf",
        paths: ["nextServiceDate", "nextInspectionDate"],
        label: "next service date",
        section: "overallCondition",
      },
      RULE_ENGINEER_SIGNATURE,
      RULE_CUSTOMER_SIGNATURE,
    ],
    signatures: [
      {
        role: "engineer",
        label: "Engineer",
        required: true,
        dataPath: "declaration.engineerSignature",
      },
      {
        role: "client",
        label: "Client",
        required: true,
        dataPath: "signatures.customer",
      },
    ],
    features: {
      ...SIMPLE_CERT_FEATURES,
    },
    review: { required: true, rolesAllowedToReview: ["admin", "office"] },
  },
};

// ════════════════════════════════════════════════════════
// Config-driven validator
// ════════════════════════════════════════════════════════

/** Resolve a dot-path like "overview.clientName" on an object */
export function resolvePath(obj: Record<string, unknown>, path: string): unknown {
  let current: unknown = obj;
  for (const key of path.split(".")) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function hasStr(val: unknown): boolean {
  return String(val ?? "").trim().length > 0;
}

export function signaturePresent(sig: unknown): boolean {
  if (!sig || typeof sig !== "object") return false;
  const s = sig as Record<string, unknown>;
  const label = String(s.signatureText || s.name || "").trim();
  return Boolean(label) && Boolean(s.signedAtISO);
}

type Check = { passed: boolean; label: string; section: string; field: string };

/** Evaluate well-known custom checks */
function evaluateCustomCheck(
  check: string,
  data: Record<string, unknown>
): boolean {
  switch (check) {
    case "boardsHaveCircuit": {
      const boards = data.boards as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(boards)) return false;
      for (const board of boards) {
        const circuits = board.circuits as
          | Array<Record<string, unknown>>
          | undefined;
        if (Array.isArray(circuits)) {
          for (const c of circuits) {
            if (!c.isEmpty) return true;
          }
        }
      }
      return false;
    }

    case "allCircuitsHaveStatus": {
      const boards = data.boards as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(boards)) return true; // no boards = vacuously true
      let hasAnyCircuit = false;
      for (const board of boards) {
        const circuits = board.circuits as
          | Array<Record<string, unknown>>
          | undefined;
        if (Array.isArray(circuits)) {
          for (const c of circuits) {
            if (c.isEmpty) continue;
            hasAnyCircuit = true;
            if (!hasStr(c.status)) return false;
          }
        }
      }
      return hasAnyCircuit ? true : true; // if no circuits, vacuously true
    }

    case "eicDesignerDetails": {
      const sameAsDesigner = Boolean(data.sameAsDesigner);
      if (sameAsDesigner) return true;
      const designSection = (data.designSection ?? {}) as Record<
        string,
        unknown
      >;
      const signatories = (data.signatories ?? {}) as Record<string, unknown>;
      return (
        hasStr(designSection.name) ||
        hasStr(designSection.qualifications) ||
        signaturePresent(designSection.signature) ||
        Boolean(signatories.sameAsDesigner)
      );
    }

    default:
      return true; // unknown checks pass by default
  }
}

/**
 * Config-driven certificate validator.
 * Validates data against the rules defined in a CertificateTypeConfig.
 */
export function validateFromRegistry(
  config: CertificateTypeConfig,
  data: Record<string, unknown>
): RegistryValidationResult {
  const checks: Check[] = [];

  for (const rule of config.validationRules) {
    switch (rule.kind) {
      case "required": {
        const val = resolvePath(data, rule.path);
        checks.push({
          passed: hasStr(val),
          label: rule.label,
          section: rule.section,
          field: rule.path,
        });
        break;
      }

      case "requiredTrue": {
        const val = resolvePath(data, rule.path);
        checks.push({
          passed: Boolean(val),
          label: rule.label,
          section: rule.section,
          field: rule.path,
        });
        break;
      }

      case "oneOf": {
        const anyPresent = rule.paths.some((p) => hasStr(resolvePath(data, p)));
        checks.push({
          passed: anyPresent,
          label: rule.label,
          section: rule.section,
          field: rule.paths[0],
        });
        break;
      }

      case "minArray": {
        const arr = resolvePath(data, rule.path);
        const ok = Array.isArray(arr) && arr.length >= rule.min;
        checks.push({
          passed: ok,
          label: rule.label,
          section: rule.section,
          field: rule.path,
        });
        break;
      }

      case "signature": {
        const sig = resolvePath(data, rule.path);
        let ok = signaturePresent(sig);
        if (!ok && rule.fallbackNamePath) {
          ok = hasStr(resolvePath(data, rule.fallbackNamePath));
        }
        // Also check legacy signatures.engineer path
        if (!ok && rule.path.includes("inspector")) {
          ok = signaturePresent(resolvePath(data, "signatures.engineer"));
        }
        checks.push({
          passed: ok,
          label: rule.label,
          section: rule.section,
          field: rule.path,
        });
        break;
      }

      case "custom": {
        const ok = evaluateCustomCheck(rule.check, data);
        checks.push({
          passed: ok,
          label: rule.label,
          section: rule.section,
          field: rule.check,
        });
        break;
      }
    }
  }

  const total = checks.length;
  const failed = checks.filter((c) => !c.passed);
  const missing = failed.map((c) => c.label);
  const errors: RegistryValidationError[] = failed.map((c) => ({
    section: c.section,
    field: c.field,
    message: `${c.label.charAt(0).toUpperCase() + c.label.slice(1)} is required`,
  }));
  const completionPercent =
    total === 0 ? 0 : Math.round(((total - failed.length) / total) * 100);

  return { ok: failed.length === 0, missing, errors, completionPercent };
}

// ════════════════════════════════════════════════════════
// Helper functions
// ════════════════════════════════════════════════════════

/** Get the full config for a certificate type */
export function getTypeConfig(
  type: CertificateType
): CertificateTypeConfig | undefined {
  return CERTIFICATE_TYPE_REGISTRY[type];
}

/** Get ordered section list for a type */
export function getTypeSections(
  type: CertificateType
): CertificateSectionConfig[] {
  return CERTIFICATE_TYPE_REGISTRY[type]?.sections ?? [];
}

/** Get required sections only */
export function getRequiredSections(
  type: CertificateType
): CertificateSectionConfig[] {
  return getTypeSections(type).filter((s) => s.required);
}

/** Get feature flags for a type */
export function getTypeFeatures(
  type: CertificateType
): CertificateFeatures | undefined {
  return CERTIFICATE_TYPE_REGISTRY[type]?.features;
}

/** Get signature requirements for a type */
export function getTypeSignatures(
  type: CertificateType
): CertificateSignatureConfig[] {
  return CERTIFICATE_TYPE_REGISTRY[type]?.signatures ?? [];
}

/** Get validation rules for a type */
export function getTypeValidationRules(
  type: CertificateType
): ValidationRule[] {
  return CERTIFICATE_TYPE_REGISTRY[type]?.validationRules ?? [];
}

/** Check if a section is included in a certificate type */
export function typeHasSection(
  type: CertificateType,
  sectionId: string
): boolean {
  return getTypeSections(type).some((s) => s.id === sectionId);
}

/** Get all certificate types in a category */
export function getTypesByCategory(
  category: CertificateTypeConfig["category"]
): CertificateTypeConfig[] {
  return Object.values(CERTIFICATE_TYPE_REGISTRY).filter(
    (c) => c.category === category
  );
}

/** Get all registered certificate type IDs */
export function getAllRegisteredTypes(): CertificateType[] {
  return Object.keys(CERTIFICATE_TYPE_REGISTRY) as CertificateType[];
}
