import { z } from "zod";

export const CERTIFICATE_TYPES = [
  "EIC", "EICR", "MWC",
  "FIRE_DESIGN", "FIRE_INSTALLATION", "FIRE_COMMISSIONING", "FIRE_INSPECTION_SERVICING",
  "EL_COMPLETION", "EL_PERIODIC",
  "SOLAR_INSTALLATION", "SOLAR_TEST_REPORT", "SOLAR_HANDOVER",
] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

export type CertificateSignature = {
  name?: string;
  signatureText?: string;
  signedAtISO?: string;
};

const signatureSchema = z.object({
  name: z.string().optional().default(""),
  signatureText: z.string().optional().default(""),
  signedAtISO: z.string().optional().default(""),
});

const overviewSchema = z.object({
  jobReference: z.string().optional().default(""),
  siteName: z.string().optional().default(""),
  installationAddress: z.string().optional().default(""),
  clientName: z.string().optional().default(""),
  clientEmail: z.string().optional().default(""),
  jobDescription: z.string().optional().default(""),
});

const installationSchema = z.object({
  descriptionOfWork: z.string().optional().default(""),
  supplyType: z.string().optional().default(""),
  earthingArrangement: z.string().optional().default(""),
  distributionType: z.string().optional().default(""),
  maxDemand: z.string().optional().default(""),
});

const inspectionSchema = z.object({
  limitations: z.string().optional().default(""),
  observations: z.string().optional().default(""),
  nextInspectionDate: z.string().optional().default(""),
});

const declarationSchema = z.object({
  extentOfWork: z.string().optional().default(""),
  worksTested: z.string().optional().default(""),
  comments: z.string().optional().default(""),
});

const assessmentSchema = z.object({
  overallAssessment: z.string().optional().default(""),
  recommendations: z.string().optional().default(""),
});

const baseSchema = z.object({
  version: z.literal(1),
  type: z.enum(CERTIFICATE_TYPES),
  overview: overviewSchema.default({ jobReference: "", siteName: "", installationAddress: "", clientName: "", clientEmail: "", jobDescription: "" }),
  installation: installationSchema.default({ descriptionOfWork: "", supplyType: "", earthingArrangement: "", distributionType: "", maxDemand: "" }),
  inspection: inspectionSchema.default({ limitations: "", observations: "", nextInspectionDate: "" }),
  declarations: declarationSchema.default({ extentOfWork: "", worksTested: "", comments: "" }),
  assessment: assessmentSchema.default({ overallAssessment: "", recommendations: "" }),
  signatures: z
    .object({
      engineer: signatureSchema.optional().default({ name: "", signatureText: "", signedAtISO: "" }),
      customer: signatureSchema.optional().default({ name: "", signatureText: "", signedAtISO: "" }),
    })
    .default({ engineer: { name: "", signatureText: "", signedAtISO: "" }, customer: { name: "", signatureText: "", signedAtISO: "" } }),
});

export const eicCertificateSchema = baseSchema.extend({ type: z.literal("EIC") });
export const eicrCertificateSchema = baseSchema.extend({ type: z.literal("EICR") });
export const mwcCertificateSchema = baseSchema.extend({ type: z.literal("MWC") });
// v2 cert types — use same base data shape (type-specific structured data lives in child tables)
export const fireDesignSchema = baseSchema.extend({ type: z.literal("FIRE_DESIGN") });
export const fireInstallationSchema = baseSchema.extend({ type: z.literal("FIRE_INSTALLATION") });
export const fireCommissioningSchema = baseSchema.extend({ type: z.literal("FIRE_COMMISSIONING") });
export const fireInspectionServicingSchema = baseSchema.extend({ type: z.literal("FIRE_INSPECTION_SERVICING") });
export const elCompletionSchema = baseSchema.extend({ type: z.literal("EL_COMPLETION") });
export const elPeriodicSchema = baseSchema.extend({ type: z.literal("EL_PERIODIC") });
export const solarInstallationSchema = baseSchema.extend({ type: z.literal("SOLAR_INSTALLATION") });
export const solarTestReportSchema = baseSchema.extend({ type: z.literal("SOLAR_TEST_REPORT") });
export const solarHandoverSchema = baseSchema.extend({ type: z.literal("SOLAR_HANDOVER") });
export const certificateDataSchema = z.union([
  eicCertificateSchema, eicrCertificateSchema, mwcCertificateSchema,
  fireDesignSchema, fireInstallationSchema, fireCommissioningSchema, fireInspectionServicingSchema,
  elCompletionSchema, elPeriodicSchema,
  solarInstallationSchema, solarTestReportSchema, solarHandoverSchema,
]);

export type CertificateData = z.infer<typeof certificateDataSchema>;

type CertificateTemplateContext = {
  jobId?: string;
  siteName?: string;
  siteAddress?: string;
  clientName?: string;
  clientEmail?: string;
  jobDescription?: string;
  inspectorName?: string;
};

function mergeDeep<T>(base: T, override: Partial<T>): T {
  if (!override || typeof override !== "object") return base;
  const out = Array.isArray(base) ? [...base] : { ...(base as Record<string, unknown>) };
  Object.entries(override).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    const baseValue = (base as Record<string, unknown>)[key];
    if (typeof baseValue === "object" && baseValue && !Array.isArray(baseValue) && typeof value === "object" && !Array.isArray(value)) {
      (out as Record<string, unknown>)[key] = mergeDeep(baseValue, value as Record<string, unknown>);
    } else {
      (out as Record<string, unknown>)[key] = value as unknown;
    }
  });
  return out as T;
}

export function getCertificateTemplate(type: CertificateType, context?: CertificateTemplateContext): CertificateData {
  const overviewAddress = [context?.siteAddress].filter(Boolean).join(", ");
  const template: CertificateData = {
    version: 1,
    type,
    overview: {
      jobReference: context?.jobId ?? "",
      siteName: context?.siteName ?? "",
      installationAddress: overviewAddress,
      clientName: context?.clientName ?? "",
      clientEmail: context?.clientEmail ?? "",
      jobDescription: context?.jobDescription ?? "",
    },
    installation: {
      descriptionOfWork: "",
      supplyType: "",
      earthingArrangement: "",
      distributionType: "",
      maxDemand: "",
    },
    inspection: {
      limitations: "",
      observations: "",
      nextInspectionDate: "",
    },
    declarations: {
      extentOfWork: "",
      worksTested: "",
      comments: "",
    },
    assessment: {
      overallAssessment: "",
      recommendations: "",
    },
    signatures: {
      engineer: {
        name: context?.inspectorName ?? "",
        signatureText: "",
        signedAtISO: "",
      },
      customer: {
        name: context?.clientName ?? "",
        signatureText: "",
        signedAtISO: "",
      },
    },
  };
  const parsed = certificateDataSchema.safeParse(template);
  return parsed.success ? parsed.data : template;
}

/**
 * Checks whether the given data uses the v2 (expanded BS 7671) shape.
 * V2 data contains structured keys like `contractorDetails`, `boards`,
 * or `generalInspection` that do not exist in the v1 flat schema.
 */
export function isV2CertificateData(data: unknown): data is Record<string, unknown> {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return (
    "contractorDetails" in d ||
    "boards" in d ||
    "generalInspection" in d ||
    "extentAndLimitations" in d ||
    d.dataVersion === 2
  );
}

export function normalizeCertificateData(
  type: CertificateType,
  input: unknown,
  context?: CertificateTemplateContext
): CertificateData {
  // V2 expanded data is validated by the shared-package Zod schemas,
  // so we pass it through without normalizing against the v1 template.
  // The cast is safe because v2 data is a superset validated elsewhere.
  if (isV2CertificateData(input)) {
    return input as unknown as CertificateData;
  }

  // V1 (legacy) path — merge against the default template.
  const template = getCertificateTemplate(type, context);
  if (!input || typeof input !== "object") return template;
  const merged = mergeDeep(template, input as Partial<CertificateData>);
  const parsed = certificateDataSchema.safeParse(merged);
  return parsed.success ? parsed.data : template;
}

export function signatureIsPresent(signature?: CertificateSignature | null): boolean {
  if (!signature) return false;
  const label = String(signature.signatureText || signature.name || "").trim();
  return Boolean(label) && Boolean(signature.signedAtISO);
}

// ── Structured validation types ──

export type ValidationError = {
  section: string;
  field: string;
  message: string;
};

export type ReadinessResult = {
  ok: boolean;
  missing: string[];
  errors: ValidationError[];
  completionPercent: number;
};

// ── Internal helpers ──

function str(val: unknown): string {
  return String(val ?? "").trim();
}

function hasStr(val: unknown): boolean {
  return str(val).length > 0;
}

function pushCheck(
  checks: { passed: boolean; missing: string; error?: ValidationError }[],
  passed: boolean,
  missingLabel: string,
  error?: ValidationError,
) {
  checks.push({ passed, missing: missingLabel, error });
}

function buildResult(checks: { passed: boolean; missing: string; error?: ValidationError }[]): ReadinessResult {
  const total = checks.length;
  const failed = checks.filter((c) => !c.passed);
  const missing = failed.map((c) => c.missing);
  const errors = failed.map((c) => c.error).filter(Boolean) as ValidationError[];
  const completionPercent = total === 0 ? 0 : Math.round(((total - failed.length) / total) * 100);
  return { ok: failed.length === 0, missing, errors, completionPercent };
}

// ── V2 per-type validators ──

function validateEICRv2(d: Record<string, unknown>): ReadinessResult {
  const checks: { passed: boolean; missing: string; error?: ValidationError }[] = [];

  // -- Overview: client name --
  const overview = (d.overview ?? {}) as Record<string, unknown>;
  const hasClientName = hasStr(overview.clientName);
  pushCheck(checks, hasClientName, "client name", {
    section: "overview", field: "clientName", message: "Client name is required",
  });

  // -- Overview: installation address --
  const hasAddress = hasStr(overview.installationAddress);
  pushCheck(checks, hasAddress, "installation address", {
    section: "overview", field: "installationAddress", message: "Installation address is required",
  });

  // -- Supply details --
  const supply = (d.supplyCharacteristics ?? {}) as Record<string, unknown>;
  const installation = (d.installation ?? {}) as Record<string, unknown>;
  const hasSupply = hasStr(supply.systemType) || hasStr(supply.numberOfPhases) || hasStr(installation.supplyType);
  pushCheck(checks, hasSupply, "supply details", {
    section: "supplyCharacteristics", field: "systemType", message: "Supply type or characteristics must be specified",
  });

  // -- Earthing arrangement --
  const earthing = (d.earthingArrangements ?? {}) as Record<string, unknown>;
  const hasEarthing = hasStr(earthing.meansOfEarthing) || hasStr(earthing.earthingConductorType) || hasStr(installation.earthingArrangement);
  pushCheck(checks, hasEarthing, "earthing arrangement", {
    section: "earthingArrangements", field: "meansOfEarthing", message: "Earthing arrangement is required",
  });

  // -- At least 1 board with at least 1 circuit, all circuits have status --
  const boards = d.boards as Array<Record<string, unknown>> | undefined;
  const hasBoard = Array.isArray(boards) && boards.length > 0;
  pushCheck(checks, hasBoard, "at least one distribution board", {
    section: "boards", field: "boards", message: "At least one distribution board is required",
  });

  let hasCircuit = false;
  let allCircuitsHaveStatus = true;
  if (hasBoard) {
    for (const board of boards!) {
      const circuits = board.circuits as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(circuits)) {
        for (const circuit of circuits) {
          if (circuit.isEmpty) continue;
          hasCircuit = true;
          if (!hasStr(circuit.status)) {
            allCircuitsHaveStatus = false;
          }
        }
      }
    }
  }
  pushCheck(checks, hasCircuit, "at least one circuit on a board", {
    section: "boards", field: "circuits", message: "At least one circuit must be present on a board",
  });
  pushCheck(checks, !hasCircuit || allCircuitsHaveStatus, "circuit status for all circuits", {
    section: "boards", field: "circuits[].status", message: "All circuits must have a test status",
  });

  // -- Overall condition --
  const hasCondition = hasStr(d.overallCondition);
  pushCheck(checks, hasCondition, "overall condition assessment", {
    section: "assessment", field: "overallCondition", message: "Overall condition must be set",
  });

  // -- Retest date (EICR uses recommendedRetestDate or nextInspectionDate) --
  const hasRetestDate = hasStr(d.recommendedRetestDate) || hasStr(d.nextInspectionDate) || hasStr((d.inspection as Record<string, unknown> | undefined)?.nextInspectionDate);
  pushCheck(checks, hasRetestDate, "retest date", {
    section: "inspection", field: "nextInspectionDate", message: "Next inspection / retest date is required",
  });

  // -- Inspector signature --
  const sigs = d.signatures as Record<string, unknown> | undefined;
  const declaration = (d.declaration ?? {}) as Record<string, unknown>;
  const declarationDetails = (d.declarationDetails ?? {}) as Record<string, unknown>;
  const inspectorSig = (declaration.inspectorSignature ?? sigs?.engineer ?? undefined) as CertificateSignature | undefined;
  const hasInspectorSig = signatureIsPresent(inspectorSig) || hasStr(declarationDetails.inspectorName);
  pushCheck(checks, hasInspectorSig, "inspector signature", {
    section: "declaration", field: "inspectorSignature", message: "Inspector signature is required",
  });

  // -- Contractor details --
  const contractor = (d.contractorDetails ?? {}) as Record<string, unknown>;
  const hasContractor = hasStr(contractor.companyName);
  pushCheck(checks, hasContractor, "contractor company name", {
    section: "contractorDetails", field: "companyName", message: "Contractor company name is required",
  });

  return buildResult(checks);
}

function validateEICv2(d: Record<string, unknown>): ReadinessResult {
  // EIC includes all EICR checks plus additional ones.
  // Re-run EICR checks as raw entries so we can combine them with EIC-specific checks.
  const checks = rerunEICRChecks(d);

  // -- Work description (EIC-specific: overview.jobDescription or installationType) --
  const overview = (d.overview ?? {}) as Record<string, unknown>;
  const installation = (d.installation ?? {}) as Record<string, unknown>;
  const hasWorkDesc = hasStr(overview.jobDescription) || hasStr(installation.descriptionOfWork) || hasStr(d.installationType);
  pushCheck(checks, hasWorkDesc, "work description", {
    section: "overview", field: "jobDescription", message: "Work description is required for EIC",
  });

  // -- Designer details OR sameAsDesigner --
  const designSection = (d.designSection ?? {}) as Record<string, unknown>;
  const sameAsDesigner = Boolean(d.sameAsDesigner);
  const signatories = (d.signatories ?? {}) as Record<string, unknown>;
  const hasDesigner = sameAsDesigner ||
    hasStr(designSection.name) ||
    hasStr(designSection.qualifications) ||
    signatureIsPresent(designSection.signature as CertificateSignature | undefined) ||
    Boolean(signatories.sameAsDesigner);
  pushCheck(checks, hasDesigner, "designer details", {
    section: "designSection", field: "name", message: "Designer details are required (or mark 'same as designer')",
  });

  return buildResult(checks);
}

/** Re-run EICR checks returning the individual check entries (for composability with EIC) */
function rerunEICRChecks(d: Record<string, unknown>): { passed: boolean; missing: string; error?: ValidationError }[] {
  const checks: { passed: boolean; missing: string; error?: ValidationError }[] = [];

  const overview = (d.overview ?? {}) as Record<string, unknown>;
  pushCheck(checks, hasStr(overview.clientName), "client name", {
    section: "overview", field: "clientName", message: "Client name is required",
  });
  pushCheck(checks, hasStr(overview.installationAddress), "installation address", {
    section: "overview", field: "installationAddress", message: "Installation address is required",
  });

  const supply = (d.supplyCharacteristics ?? {}) as Record<string, unknown>;
  const installation = (d.installation ?? {}) as Record<string, unknown>;
  pushCheck(checks, hasStr(supply.systemType) || hasStr(supply.numberOfPhases) || hasStr(installation.supplyType), "supply details", {
    section: "supplyCharacteristics", field: "systemType", message: "Supply type or characteristics must be specified",
  });

  const earthing = (d.earthingArrangements ?? {}) as Record<string, unknown>;
  pushCheck(checks, hasStr(earthing.meansOfEarthing) || hasStr(earthing.earthingConductorType) || hasStr(installation.earthingArrangement), "earthing arrangement", {
    section: "earthingArrangements", field: "meansOfEarthing", message: "Earthing arrangement is required",
  });

  const boards = d.boards as Array<Record<string, unknown>> | undefined;
  const hasBoard = Array.isArray(boards) && boards.length > 0;
  pushCheck(checks, hasBoard, "at least one distribution board", {
    section: "boards", field: "boards", message: "At least one distribution board is required",
  });

  let hasCircuit = false;
  let allCircuitsHaveStatus = true;
  if (hasBoard) {
    for (const board of boards!) {
      const circuits = board.circuits as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(circuits)) {
        for (const circuit of circuits) {
          if (circuit.isEmpty) continue;
          hasCircuit = true;
          if (!hasStr(circuit.status)) allCircuitsHaveStatus = false;
        }
      }
    }
  }
  pushCheck(checks, hasCircuit, "at least one circuit on a board", {
    section: "boards", field: "circuits", message: "At least one circuit must be present on a board",
  });
  pushCheck(checks, !hasCircuit || allCircuitsHaveStatus, "circuit status for all circuits", {
    section: "boards", field: "circuits[].status", message: "All circuits must have a test status",
  });

  pushCheck(checks, hasStr(d.overallCondition), "overall condition assessment", {
    section: "assessment", field: "overallCondition", message: "Overall condition must be set",
  });

  pushCheck(checks, hasStr(d.recommendedRetestDate) || hasStr(d.nextInspectionDate) || hasStr((d.inspection as Record<string, unknown> | undefined)?.nextInspectionDate), "retest date", {
    section: "inspection", field: "nextInspectionDate", message: "Next inspection / retest date is required",
  });

  const sigs = d.signatures as Record<string, unknown> | undefined;
  const declaration = (d.declaration ?? {}) as Record<string, unknown>;
  const declarationDetails = (d.declarationDetails ?? {}) as Record<string, unknown>;
  const inspectorSig = (declaration.inspectorSignature ?? sigs?.engineer ?? undefined) as CertificateSignature | undefined;
  pushCheck(checks, signatureIsPresent(inspectorSig) || hasStr(declarationDetails.inspectorName), "inspector signature", {
    section: "declaration", field: "inspectorSignature", message: "Inspector signature is required",
  });

  const contractor = (d.contractorDetails ?? {}) as Record<string, unknown>;
  pushCheck(checks, hasStr(contractor.companyName), "contractor company name", {
    section: "contractorDetails", field: "companyName", message: "Contractor company name is required",
  });

  return checks;
}

function validateMWCv2(d: Record<string, unknown>): ReadinessResult {
  const checks: { passed: boolean; missing: string; error?: ValidationError }[] = [];

  // -- Client name --
  const overview = (d.overview ?? {}) as Record<string, unknown>;
  pushCheck(checks, hasStr(overview.clientName), "client name", {
    section: "overview", field: "clientName", message: "Client name is required",
  });

  // -- Installation address --
  pushCheck(checks, hasStr(overview.installationAddress), "installation address", {
    section: "overview", field: "installationAddress", message: "Installation address is required",
  });

  // -- Work description --
  const installation = (d.installation ?? {}) as Record<string, unknown>;
  const hasWorkDesc = hasStr(d.workDescription) || hasStr(overview.jobDescription) || hasStr(installation.descriptionOfWork);
  pushCheck(checks, hasWorkDesc, "work description", {
    section: "overview", field: "workDescription", message: "Work description is required",
  });

  // -- Circuit details: circuitReference present --
  const circuitDetails = (d.circuitDetails ?? {}) as Record<string, unknown>;
  const hasCircuitRef = hasStr(circuitDetails.circuitReference) || hasStr(circuitDetails.circuitAffected);
  pushCheck(checks, hasCircuitRef, "circuit reference", {
    section: "circuitDetails", field: "circuitReference", message: "Circuit reference or affected circuit is required",
  });

  // -- Test results: continuity + IR --
  const testResults = (d.testResults ?? {}) as Record<string, unknown>;
  const hasContinuity = hasStr(testResults.continuity) || hasStr(testResults.continuityOfProtectiveConductors);
  pushCheck(checks, hasContinuity, "continuity test result", {
    section: "testResults", field: "continuity", message: "Continuity test result is required",
  });

  const hasIR = hasStr(testResults.insulationResistance) || hasStr(testResults.insulationResistanceLE) || hasStr(testResults.insulationResistanceLN);
  pushCheck(checks, hasIR, "insulation resistance test result", {
    section: "testResults", field: "insulationResistance", message: "Insulation resistance test result is required",
  });

  // -- Polarity confirmed --
  const polarityConfirmed = Boolean(testResults.polarityConfirmed);
  pushCheck(checks, polarityConfirmed, "polarity confirmation", {
    section: "testResults", field: "polarityConfirmed", message: "Polarity must be confirmed",
  });

  // -- Contractor details --
  const contractor = (d.contractorDetails ?? {}) as Record<string, unknown>;
  pushCheck(checks, hasStr(contractor.companyName), "contractor company name", {
    section: "contractorDetails", field: "companyName", message: "Contractor company name is required",
  });

  return buildResult(checks);
}

// ── Main function ──

export function certificateIsReadyForCompletion(
  data: CertificateData
): ReadinessResult {
  const d = data as Record<string, unknown>;

  // --- V2 path: per-type structured validation ---
  if (isV2CertificateData(d)) {
    const certType = str(d.type);

    if (certType === "EICR") return validateEICRv2(d);
    if (certType === "EIC") return validateEICv2(d);
    if (certType === "MWC") return validateMWCv2(d);

    // For other v2 types (fire, EL, solar, etc.) fall through to generic v2 checks
    const checks: { passed: boolean; missing: string; error?: ValidationError }[] = [];

    // Generic v2 checks: contractor + boards + overall condition + signatures
    const contractor = (d.contractorDetails ?? {}) as Record<string, unknown>;
    pushCheck(checks, hasStr(contractor.companyName), "contractor company name", {
      section: "contractorDetails", field: "companyName", message: "Contractor company name is required",
    });

    if ("boards" in d) {
      const boards = d.boards as Array<Record<string, unknown>> | undefined;
      const hasBoard = Array.isArray(boards) && boards.length > 0;
      pushCheck(checks, hasBoard, "at least one distribution board", {
        section: "boards", field: "boards", message: "At least one distribution board is required",
      });
      if (hasBoard) {
        const hasCircuit = boards!.some((board) => {
          const circuits = board.circuits as unknown[] | undefined;
          return Array.isArray(circuits) && circuits.length > 0;
        });
        pushCheck(checks, hasCircuit, "at least one circuit on a board", {
          section: "boards", field: "circuits", message: "At least one circuit must be present on a board",
        });
      }
    }

    if ("overallCondition" in d) {
      pushCheck(checks, hasStr(d.overallCondition), "overall condition assessment", {
        section: "assessment", field: "overallCondition", message: "Overall condition must be set",
      });
    }

    const sigs = d.signatures as
      | { engineer?: CertificateSignature; customer?: CertificateSignature }
      | undefined;
    pushCheck(checks, signatureIsPresent(sigs?.engineer), "engineer signature", {
      section: "signatures", field: "engineer", message: "Engineer signature is required",
    });
    pushCheck(checks, signatureIsPresent(sigs?.customer), "customer signature", {
      section: "signatures", field: "customer", message: "Customer signature is required",
    });

    return buildResult(checks);
  }

  // --- V1 (legacy) path — backward-compatible checks ---
  const missing: string[] = [];
  const errors: ValidationError[] = [];

  const v1 = data as Record<string, unknown>;
  const sigs = v1.signatures as
    | { engineer?: CertificateSignature; customer?: CertificateSignature }
    | undefined;
  if (!signatureIsPresent(sigs?.engineer)) {
    missing.push("engineer signature");
    errors.push({ section: "signatures", field: "engineer", message: "Engineer signature is required" });
  }
  if (!signatureIsPresent(sigs?.customer)) {
    missing.push("customer signature");
    errors.push({ section: "signatures", field: "customer", message: "Customer signature is required" });
  }

  // V1 has 2 total checks (engineer + customer signatures)
  const total = 2;
  const completionPercent = Math.round(((total - missing.length) / total) * 100);

  return { ok: missing.length === 0, missing, errors, completionPercent };
}
