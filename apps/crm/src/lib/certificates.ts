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

export function normalizeCertificateData(
  type: CertificateType,
  input: unknown,
  context?: CertificateTemplateContext
): CertificateData {
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

export function certificateIsReadyForCompletion(data: CertificateData): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!signatureIsPresent(data.signatures?.engineer)) missing.push("engineer signature");
  if (!signatureIsPresent(data.signatures?.customer)) missing.push("customer signature");
  return { ok: missing.length === 0, missing };
}
