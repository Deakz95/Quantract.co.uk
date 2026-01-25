import { z } from "zod";

// Certificate types supported
export const CERTIFICATE_TYPES = ["EIC", "EICR", "MWC"] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

export const CERTIFICATE_INFO: Record<CertificateType, { name: string; description: string }> = {
  EIC: {
    name: "Electrical Installation Certificate",
    description: "For new installations or additions/alterations to existing installations",
  },
  EICR: {
    name: "Electrical Installation Condition Report",
    description: "For periodic inspection and testing of existing installations",
  },
  MWC: {
    name: "Minor Electrical Installation Works Certificate",
    description: "For minor works that do not require a new circuit",
  },
};

// Signature type
export type CertificateSignature = {
  name?: string;
  signatureText?: string;
  signedAtISO?: string;
};

// Common overview schema
const overviewSchema = z.object({
  jobReference: z.string().optional().default(""),
  siteName: z.string().optional().default(""),
  installationAddress: z.string().optional().default(""),
  clientName: z.string().optional().default(""),
  clientEmail: z.string().optional().default(""),
  jobDescription: z.string().optional().default(""),
  occupier: z.string().optional().default(""),
  dateOfInspection: z.string().optional().default(""),
});

// EIC specific schemas
const supplyCharacteristicsSchema = z.object({
  systemType: z.enum(["TN-C-S", "TN-S", "TT", "IT", ""]).optional().default(""),
  supplyVoltage: z.string().optional().default("230"),
  frequency: z.string().optional().default("50"),
  prospectiveFaultCurrent: z.string().optional().default(""),
  externalLoopImpedance: z.string().optional().default(""),
  supplyProtectiveDevice: z.string().optional().default(""),
  ratedCurrent: z.string().optional().default(""),
});

const earthingArrangementsSchema = z.object({
  earthElectrode: z.boolean().optional().default(false),
  earthElectrodeResistance: z.string().optional().default(""),
  earthingConductorType: z.string().optional().default(""),
  earthingConductorSize: z.string().optional().default(""),
  mainProtectiveBondingType: z.string().optional().default(""),
  mainProtectiveBondingSize: z.string().optional().default(""),
  bondedServices: z.array(z.string()).optional().default([]),
});

const testResultsSchema = z.object({
  continuityOfProtectiveConductors: z.string().optional().default(""),
  continuityOfRingFinalCircuits: z.string().optional().default(""),
  insulationResistance: z.string().optional().default(""),
  polarityConfirmed: z.boolean().optional().default(false),
  earthFaultLoopImpedance: z.string().optional().default(""),
  rcdOperatingTime: z.string().optional().default(""),
  rcdOperatingCurrent: z.string().optional().default(""),
});

const circuitSchema = z.object({
  circuitNumber: z.string().optional().default(""),
  circuitDescription: z.string().optional().default(""),
  wiringType: z.string().optional().default(""),
  referenceMethod: z.string().optional().default(""),
  conductorSize: z.string().optional().default(""),
  protectiveDevice: z.string().optional().default(""),
  rating: z.string().optional().default(""),
  maxZs: z.string().optional().default(""),
  measuredZs: z.string().optional().default(""),
  rcdType: z.string().optional().default(""),
  rcdRating: z.string().optional().default(""),
  testResult: z.enum(["pass", "fail", ""]).optional().default(""),
});

// EIC Certificate schema
export const eicCertificateSchema = z.object({
  type: z.literal("EIC"),
  overview: overviewSchema,
  supplyCharacteristics: supplyCharacteristicsSchema,
  earthingArrangements: earthingArrangementsSchema,
  testResults: testResultsSchema,
  scheduleOfCircuits: z.array(circuitSchema).optional().default([]),
  observations: z.string().optional().default(""),
  declaration: z.object({
    designerSignature: z.custom<CertificateSignature>().optional(),
    installerSignature: z.custom<CertificateSignature>().optional(),
    inspectorSignature: z.custom<CertificateSignature>().optional(),
  }).optional().default({}),
});

// EICR specific schemas
const eicrObservationSchema = z.object({
  code: z.string().optional().default(""),
  observation: z.string().optional().default(""),
  recommendation: z.string().optional().default(""),
  location: z.string().optional().default(""),
});

export const eicrCertificateSchema = z.object({
  type: z.literal("EICR"),
  overview: overviewSchema,
  supplyCharacteristics: supplyCharacteristicsSchema,
  earthingArrangements: earthingArrangementsSchema,
  testResults: testResultsSchema,
  scheduleOfCircuits: z.array(circuitSchema).optional().default([]),
  observations: z.array(eicrObservationSchema).optional().default([]),
  overallCondition: z.enum(["satisfactory", "unsatisfactory", ""]).optional().default(""),
  recommendedRetestDate: z.string().optional().default(""),
  declaration: z.object({
    inspectorSignature: z.custom<CertificateSignature>().optional(),
  }).optional().default({}),
});

// MWC Certificate schema
export const mwcCertificateSchema = z.object({
  type: z.literal("MWC"),
  overview: overviewSchema,
  workDescription: z.string().optional().default(""),
  circuitDetails: z.object({
    circuitAffected: z.string().optional().default(""),
    protectiveDevice: z.string().optional().default(""),
    rating: z.string().optional().default(""),
    location: z.string().optional().default(""),
  }).optional().default({}),
  testResults: z.object({
    continuity: z.string().optional().default(""),
    insulationResistance: z.string().optional().default(""),
    polarityConfirmed: z.boolean().optional().default(false),
    earthFaultLoopImpedance: z.string().optional().default(""),
    rcdOperatingTime: z.string().optional().default(""),
  }).optional().default({}),
  observations: z.string().optional().default(""),
  declaration: z.object({
    installerSignature: z.custom<CertificateSignature>().optional(),
  }).optional().default({}),
});

// Union of all certificate types
export const certificateDataSchema = z.union([eicCertificateSchema, eicrCertificateSchema, mwcCertificateSchema]);
export type CertificateData = z.infer<typeof certificateDataSchema>;

export type EICCertificate = z.infer<typeof eicCertificateSchema>;
export type EICRCertificate = z.infer<typeof eicrCertificateSchema>;
export type MWCCertificate = z.infer<typeof mwcCertificateSchema>;

// Get empty template for a certificate type
export function getCertificateTemplate(type: CertificateType): CertificateData {
  const now = new Date().toISOString().split("T")[0];

  switch (type) {
    case "EIC":
      return eicCertificateSchema.parse({
        type: "EIC",
        overview: { dateOfInspection: now },
        supplyCharacteristics: {},
        earthingArrangements: {},
        testResults: {},
        scheduleOfCircuits: [],
        observations: "",
        declaration: {},
      });
    case "EICR":
      return eicrCertificateSchema.parse({
        type: "EICR",
        overview: { dateOfInspection: now },
        supplyCharacteristics: {},
        earthingArrangements: {},
        testResults: {},
        scheduleOfCircuits: [],
        observations: [],
        overallCondition: "",
        recommendedRetestDate: "",
        declaration: {},
      });
    case "MWC":
      return mwcCertificateSchema.parse({
        type: "MWC",
        overview: { dateOfInspection: now },
        workDescription: "",
        circuitDetails: {},
        testResults: {},
        observations: "",
        declaration: {},
      });
  }
}
