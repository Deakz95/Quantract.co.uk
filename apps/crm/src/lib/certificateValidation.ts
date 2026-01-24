/**
 * Certificate Validation - Strict schemas for completion compliance
 *
 * CRITICAL: Certificates are legal documents. All completed certificates MUST
 * have complete, valid data before being marked as completed or issued.
 */

import { z } from "zod";
import type { CertificateType, CertificateData } from "./certificates";

/**
 * Signature schema for completion - REQUIRES name and signature
 */
const completionSignatureSchema = z.object({
  name: z.string().min(1, "Signature name is required"),
  signatureText: z.string().min(1, "Signature is required"),
  signedAtISO: z.string().min(1, "Signature date is required"),
});

/**
 * Overview schema for completion - REQUIRES key installation details
 */
const completionOverviewSchema = z.object({
  jobReference: z.string().optional(),
  siteName: z.string().min(1, "Site name is required"),
  installationAddress: z.string().min(1, "Installation address is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Valid client email is required").optional().or(z.literal("")),
  jobDescription: z.string().min(1, "Job description is required"),
});

/**
 * Installation schema for completion - REQUIRES critical electrical details
 */
const completionInstallationSchema = z.object({
  descriptionOfWork: z.string().min(1, "Description of work is required"),
  supplyType: z.string().min(1, "Supply type is required"),
  earthingArrangement: z.string().min(1, "Earthing arrangement is required"),
  distributionType: z.string().optional(),
  maxDemand: z.string().optional(),
});

/**
 * Inspection schema for completion
 */
const completionInspectionSchema = z.object({
  limitations: z.string().optional(),
  observations: z.string().optional(),
  nextInspectionDate: z.string().optional(),
});

/**
 * Declaration schema for completion
 */
const completionDeclarationSchema = z.object({
  extentOfWork: z.string().optional(),
  worksTested: z.string().optional(),
  comments: z.string().optional(),
});

/**
 * Assessment schema for completion (EICR specific)
 */
const completionAssessmentSchema = z.object({
  overallAssessment: z.string().optional(),
  recommendations: z.string().optional(),
});

/**
 * Base certificate schema for completion - ALL required fields
 */
const baseCompletionSchema = z.object({
  version: z.literal(1),
  overview: completionOverviewSchema,
  installation: completionInstallationSchema,
  inspection: completionInspectionSchema,
  declarations: completionDeclarationSchema,
  assessment: completionAssessmentSchema,
  signatures: z.object({
    engineer: completionSignatureSchema,
    customer: completionSignatureSchema,
  }),
});

/**
 * EIC (Electrical Installation Certificate) completion schema
 */
export const eicCompletionSchema = baseCompletionSchema.extend({
  type: z.literal("EIC"),
});

/**
 * EICR (Electrical Installation Condition Report) completion schema
 */
export const eicrCompletionSchema = baseCompletionSchema.extend({
  type: z.literal("EICR"),
  assessment: completionAssessmentSchema.extend({
    overallAssessment: z.string().min(1, "Overall assessment is required for EICR"),
  }),
});

/**
 * MWC (Minor Works Certificate) completion schema
 */
export const mwcCompletionSchema = baseCompletionSchema.extend({
  type: z.literal("MWC"),
});

/**
 * Union of all completion schemas
 */
export const certificateCompletionSchema = z.discriminatedUnion("type", [
  eicCompletionSchema,
  eicrCompletionSchema,
  mwcCompletionSchema,
]);

export type CertificateCompletionData = z.infer<typeof certificateCompletionSchema>;

/**
 * Validate certificate data for completion readiness.
 *
 * @param type - Certificate type
 * @param data - Certificate data to validate
 * @returns Validation result with detailed error messages
 */
export function validateCertificateForCompletion(
  type: CertificateType,
  data: unknown
): { ok: true } | { ok: false; errors: string[] } {
  try {
    // Select schema based on type
    let schema: z.ZodType;
    switch (type) {
      case "EIC":
        schema = eicCompletionSchema;
        break;
      case "EICR":
        schema = eicrCompletionSchema;
        break;
      case "MWC":
        schema = mwcCompletionSchema;
        break;
      default:
        return { ok: false, errors: [`Unknown certificate type: ${type}`] };
    }

    // Validate
    const result = schema.safeParse(data);

    if (result.success) {
      return { ok: true };
    }

    // Extract error messages
    const errors = result.error.errors.map((err) => {
      const path = err.path.join(".");
      return `${path}: ${err.message}`;
    });

    return { ok: false, errors };
  } catch (error) {
    return { ok: false, errors: ["Validation failed: " + String(error)] };
  }
}

/**
 * Check if certificate data meets minimum requirements for completion.
 * This is a lighter check than full validation.
 *
 * @param data - Certificate data
 * @returns true if ready, false otherwise
 */
export function isCertificateReadyForCompletion(data: CertificateData): boolean {
  // Check engineer signature
  const engineerSig = data.signatures?.engineer;
  const hasEngineerSig =
    engineerSig &&
    engineerSig.name &&
    engineerSig.signatureText &&
    engineerSig.signedAtISO;

  // Check customer signature
  const customerSig = data.signatures?.customer;
  const hasCustomerSig =
    customerSig &&
    customerSig.name &&
    customerSig.signatureText &&
    customerSig.signedAtISO;

  // Check basic required fields
  const hasBasicInfo =
    data.overview?.siteName &&
    data.overview?.installationAddress &&
    data.overview?.clientName &&
    data.overview?.jobDescription &&
    data.installation?.descriptionOfWork &&
    data.installation?.supplyType &&
    data.installation?.earthingArrangement;

  // EICR specific: requires overall assessment
  if (data.type === "EICR") {
    const hasAssessment = data.assessment?.overallAssessment;
    return Boolean(hasEngineerSig && hasCustomerSig && hasBasicInfo && hasAssessment);
  }

  return Boolean(hasEngineerSig && hasCustomerSig && hasBasicInfo);
}
