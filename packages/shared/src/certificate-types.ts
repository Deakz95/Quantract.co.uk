import { z } from "zod";

// Certificate types supported
export const CERTIFICATE_TYPES = ["EIC", "EICR", "MWC", "FIRE", "EML"] as const;
export type CertificateType = (typeof CERTIFICATE_TYPES)[number];

export const CERTIFICATE_INFO: Record<CertificateType, { name: string; description: string; icon: string }> = {
  EIC: {
    name: "Electrical Installation Certificate",
    description: "For new installations or additions/alterations to existing installations",
    icon: "certificate",
  },
  EICR: {
    name: "Electrical Installation Condition Report",
    description: "For periodic inspection and testing of existing installations",
    icon: "clipboard",
  },
  MWC: {
    name: "Minor Electrical Installation Works Certificate",
    description: "For minor works that do not require a new circuit",
    icon: "edit",
  },
  FIRE: {
    name: "Fire Alarm System Certificate",
    description: "For fire alarm installation, commissioning, and servicing (BS 5839)",
    icon: "flame",
  },
  EML: {
    name: "Emergency Lighting Certificate",
    description: "For emergency lighting installation and testing (BS 5266)",
    icon: "lightbulb",
  },
};

// Signature type
export type CertificateSignature = {
  name?: string;
  signatureText?: string;
  signedAtISO?: string;
};

// ── BS 7671 Shared Sub-schemas ──

// Contractor / company details (BS 7671 Section 1)
export const contractorDetailsSchema = z.object({
  companyName: z.string().optional().default(""),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  registrationNumber: z.string().optional().default(""),
  schemeName: z.enum(["NICEIC", "NAPIT", "ELECSA", "STROMA", "BRE", "Other", ""]).optional().default(""),
  schemeNumber: z.string().optional().default(""),
});

// Common overview schema (expanded)
const overviewSchema = z.object({
  jobReference: z.string().optional().default(""),
  siteName: z.string().optional().default(""),
  installationAddress: z.string().optional().default(""),
  clientName: z.string().optional().default(""),
  clientEmail: z.string().optional().default(""),
  clientPhone: z.string().optional().default(""),
  jobDescription: z.string().optional().default(""),
  occupier: z.string().optional().default(""),
  dateOfInspection: z.string().optional().default(""),
  descriptionOfPremises: z.enum([
    "domestic", "commercial", "industrial", "agricultural",
    "public", "residential", "educational", "healthcare", "other", ""
  ]).optional().default(""),
  estimatedAgeOfWiring: z.string().optional().default(""),
  evidenceOfAlterations: z.boolean().optional().default(false),
  alterationsDetails: z.string().optional().default(""),
  dateOfLastInspection: z.string().optional().default(""),
  recordsAvailable: z.boolean().optional().default(false),
  previousReportReference: z.string().optional().default(""),
  purposeOfReport: z.string().optional().default(""),
});

// Extent and limitations (BS 7671 Section 2)
export const extentAndLimitationsSchema = z.object({
  extentCovered: z.string().optional().default(""),
  agreedLimitations: z.string().optional().default(""),
  operationalLimitations: z.string().optional().default(""),
  complianceConfirmed: z.boolean().optional().default(false),
});

// Supply characteristics (expanded per BS 7671)
const supplyCharacteristicsSchema = z.object({
  systemType: z.enum(["TN-C-S", "TN-S", "TT", "IT", ""]).optional().default(""),
  supplyVoltage: z.string().optional().default("230"),
  frequency: z.string().optional().default("50"),
  prospectiveFaultCurrent: z.string().optional().default(""),
  externalLoopImpedance: z.string().optional().default(""),
  supplyProtectiveDevice: z.string().optional().default(""),
  ratedCurrent: z.string().optional().default(""),
  numberOfPhases: z.enum(["single", "three", ""]).optional().default(""),
  nominalVoltageToEarth: z.string().optional().default(""),
  nominalVoltageBetweenPhases: z.string().optional().default(""),
  natureOfSupply: z.enum(["AC", "DC", ""]).optional().default(""),
  supplyProtectiveDeviceType: z.string().optional().default(""),
  supplyProtectiveDeviceRating: z.string().optional().default(""),
  otherSourcesOfSupply: z.boolean().optional().default(false),
  otherSourcesDetails: z.string().optional().default(""),
});

// Earthing arrangements (expanded per BS 7671)
const earthingArrangementsSchema = z.object({
  earthElectrode: z.boolean().optional().default(false),
  earthElectrodeResistance: z.string().optional().default(""),
  earthingConductorType: z.string().optional().default(""),
  earthingConductorSize: z.string().optional().default(""),
  mainProtectiveBondingType: z.string().optional().default(""),
  mainProtectiveBondingSize: z.string().optional().default(""),
  bondedServices: z.array(z.string()).optional().default([]),
  meansOfEarthing: z.enum([
    "supply_distributor", "earth_electrode", "other", ""
  ]).optional().default(""),
  earthElectrodeType: z.enum([
    "rod", "tape", "plate", "ring", "foundation", "other", ""
  ]).optional().default(""),
  supplementaryBondingPresent: z.boolean().optional().default(false),
  bondingToWater: z.boolean().optional().default(false),
  bondingToGas: z.boolean().optional().default(false),
  bondingToOil: z.boolean().optional().default(false),
  bondingToStructuralSteel: z.boolean().optional().default(false),
  bondingToLightningProtection: z.boolean().optional().default(false),
  bondingToOther: z.boolean().optional().default(false),
  bondingToOtherDetails: z.string().optional().default(""),
  zeMeasured: z.string().optional().default(""),
});

// Test results (shared)
const testResultsSchema = z.object({
  continuityOfProtectiveConductors: z.string().optional().default(""),
  continuityOfRingFinalCircuits: z.string().optional().default(""),
  insulationResistance: z.string().optional().default(""),
  polarityConfirmed: z.boolean().optional().default(false),
  earthFaultLoopImpedance: z.string().optional().default(""),
  rcdOperatingTime: z.string().optional().default(""),
  rcdOperatingCurrent: z.string().optional().default(""),
});

// Circuit schema
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

// ── BS 7671 EICR-specific schemas ──

// General inspection item (checklist entry)
export const generalInspectionItemSchema = z.object({
  category: z.string().optional().default(""),
  itemCode: z.string().optional().default(""),
  description: z.string().optional().default(""),
  outcome: z.enum(["pass", "fail", "C1", "C2", "C3", "na", "lim", ""]).optional().default(""),
});

// EICR observation (expanded)
const eicrObservationSchema = z.object({
  code: z.string().optional().default(""),
  observation: z.string().optional().default(""),
  recommendation: z.string().optional().default(""),
  location: z.string().optional().default(""),
  observationNumber: z.number().optional(),
  regulationReference: z.string().optional().default(""),
  inspectionItemCode: z.string().optional().default(""),
  actionTaken: z.string().optional().default(""),
  actionRecommended: z.string().optional().default(""),
});

// Summary of condition (auto-calculated client-side)
export const summaryOfConditionSchema = z.object({
  c1Count: z.number().optional().default(0),
  c2Count: z.number().optional().default(0),
  c3Count: z.number().optional().default(0),
  fiCount: z.number().optional().default(0),
});

// Declaration (BS 7671)
export const declarationSchema = z.object({
  inspectorName: z.string().optional().default(""),
  inspectorQualifications: z.string().optional().default(""),
  inspectorPosition: z.string().optional().default(""),
  inspectorDateSigned: z.string().optional().default(""),
  complianceConfirmed: z.boolean().optional().default(false),
  inspectorSignature: z.custom<CertificateSignature>().optional(),
});

// Client acknowledgement
export const clientAcknowledgementSchema = z.object({
  clientName: z.string().optional().default(""),
  clientDateSigned: z.string().optional().default(""),
  clientSignature: z.custom<CertificateSignature>().optional(),
});

// Board circuit schema — BS 7671:2018+A2:2022 full schedule (33 columns)
export const boardCircuitSchema = z.object({
  id: z.string().optional().default(""),
  // Core identity
  circuitNumber: z.union([z.number(), z.string()]).optional().default(""),
  description: z.string().optional().default(""),
  phase: z.enum(["L1", "L2", "L3", "TPN", "3P", "single", ""]).optional().default(""),
  isEmpty: z.boolean().optional().default(false),
  // Conductor details
  typeOfWiring: z.string().optional().default(""),
  referenceMethod: z.string().optional().default(""),
  numberOfPoints: z.union([z.number(), z.string()]).optional().default(""),
  liveCsa: z.string().optional().default(""),
  cpcCsa: z.string().optional().default(""),
  // Overcurrent protective device
  ocpdNumberAndSize: z.string().optional().default(""),
  maxDisconnectionTime: z.string().optional().default(""),
  ocpdBsEn: z.string().optional().default(""),
  ocpdType: z.string().optional().default(""),
  ocpdRating: z.string().optional().default(""),
  breakingCapacity: z.string().optional().default(""),
  maxPermittedZs: z.string().optional().default(""),
  // RCD
  rcdBsEn: z.string().optional().default(""),
  rcdType: z.string().optional().default(""),
  rcdRatedCurrent: z.string().optional().default(""),
  rcdRating: z.string().optional().default(""),
  // Continuity — Ring final circuit
  ringR1: z.string().optional().default(""),
  ringRn: z.string().optional().default(""),
  ringR2: z.string().optional().default(""),
  // Continuity — Radial
  r1PlusR2: z.string().optional().default(""),
  // Insulation resistance
  irTestVoltage: z.string().optional().default(""),
  irLiveLive: z.string().optional().default(""),
  irLiveEarth: z.string().optional().default(""),
  // Zs
  polarityConfirmed: z.boolean().optional().default(false),
  zsMaximum: z.string().optional().default(""),
  zsMeasured: z.string().optional().default(""),
  // RCD test
  rcdDisconnectionTime: z.string().optional().default(""),
  // AFDD
  afddTestButton: z.boolean().optional().default(false),
  afddManualTest: z.boolean().optional().default(false),
  // Status & observations
  status: z.string().optional().default(""),
  observationCode: z.string().optional().default(""),
  // Legacy field aliases (backward compat with EIC/MWC old-format boards)
  num: z.union([z.number(), z.string()]).optional(),
  type: z.string().optional(),
  rating: z.string().optional(),
  bsen: z.string().optional(),
  cableMm2: z.string().optional(),
  cpcMm2: z.string().optional(),
  cableType: z.string().optional(),
  maxZs: z.string().optional(),
  zs: z.string().optional(),
  r1r2: z.string().optional(),
  r2: z.string().optional(),
  insMohm: z.string().optional(),
  rcdMa: z.string().optional(),
  rcdMs: z.string().optional(),
  code: z.string().optional(),
});

// Board data schema — expanded with DB header fields (BS 7671)
export const boardDataSchema = z.object({
  id: z.string().optional().default(""),
  name: z.string().optional().default(""),
  description: z.string().optional().default(""),
  designation: z.string().optional().default(""),
  type: z.enum(["single-phase", "three-phase"]).optional().default("single-phase"),
  manufacturer: z.string().optional().default(""),
  model: z.string().optional().default(""),
  location: z.string().optional().default(""),
  ipRating: z.string().optional().default(""),
  numWays: z.number().optional(),
  mainSwitch: z.object({
    rating: z.string().optional().default(""),
    type: z.string().optional().default(""),
  }).optional().default({ rating: "", type: "" }),
  rcdDetails: z.string().optional().default(""),
  // DB header fields (BS 7671)
  suppliedFrom: z.string().optional().default(""),
  ocpdBsEn: z.string().optional().default(""),
  ocpdType: z.string().optional().default(""),
  ocpdRating: z.string().optional().default(""),
  spdType: z.string().optional().default(""),
  spdStatusChecked: z.boolean().optional().default(false),
  supplyPolarityConfirmed: z.boolean().optional().default(false),
  phaseSequenceConfirmed: z.boolean().optional().default(false),
  zsAtDb: z.string().optional().default(""),
  ipfAtDb: z.string().optional().default(""),
  typeOfWiringOther: z.string().optional().default(""),
  circuits: z.array(boardCircuitSchema).optional().default([]),
});

// Test instruments schema (certificate-level, not per-board)
export const testInstrumentsSchema = z.object({
  instrumentSet: z.string().optional().default(""),
  multiFunctionalSerial: z.string().optional().default(""),
  insulationResistanceSerial: z.string().optional().default(""),
  continuitySerial: z.string().optional().default(""),
  earthFaultLoopSerial: z.string().optional().default(""),
  rcdSerial: z.string().optional().default(""),
});

// Migrate legacy circuit data (old 15-column format) to BS 7671 33-column format
export function migrateCircuit(c: Record<string, unknown>): BoardCircuit {
  const s = (v: unknown) => (v != null ? String(v) : "");
  const sn = (a: unknown, b: unknown) => (a != null && a !== "" ? String(a) : b != null && b !== "" ? String(b) : "");
  const circNum = c.circuitNumber ?? c.num;
  const nPts = c.numberOfPoints;
  return {
    id: s(c.id) || crypto.randomUUID(),
    circuitNumber: (typeof circNum === "number" ? circNum : s(circNum)) as string | number,
    description: s(c.description),
    phase: (s(c.phase) || "") as BoardCircuit["phase"],
    isEmpty: Boolean(c.isEmpty ?? false),
    typeOfWiring: s(c.typeOfWiring),
    referenceMethod: s(c.referenceMethod),
    numberOfPoints: (typeof nPts === "number" ? nPts : s(nPts)) as string | number,
    liveCsa: sn(c.liveCsa, c.cableMm2),
    cpcCsa: sn(c.cpcCsa, c.cpcMm2),
    ocpdNumberAndSize: s(c.ocpdNumberAndSize),
    maxDisconnectionTime: s(c.maxDisconnectionTime),
    ocpdBsEn: sn(c.ocpdBsEn, c.bsen),
    ocpdType: sn(c.ocpdType, c.type),
    ocpdRating: sn(c.ocpdRating, c.rating),
    breakingCapacity: s(c.breakingCapacity),
    maxPermittedZs: sn(c.maxPermittedZs, c.maxZs),
    rcdBsEn: s(c.rcdBsEn),
    rcdType: s(c.rcdType),
    rcdRatedCurrent: sn(c.rcdRatedCurrent, c.rcdMa),
    rcdRating: s(c.rcdRating),
    ringR1: s(c.ringR1),
    ringRn: s(c.ringRn),
    ringR2: s(c.ringR2),
    r1PlusR2: sn(c.r1PlusR2, c.r1r2),
    irTestVoltage: s(c.irTestVoltage) || (c.insMohm ? "500" : ""),
    irLiveLive: s(c.irLiveLive),
    irLiveEarth: sn(c.irLiveEarth, c.insMohm),
    polarityConfirmed: Boolean(c.polarityConfirmed ?? false),
    zsMaximum: s(c.zsMaximum),
    zsMeasured: sn(c.zsMeasured, c.zs),
    rcdDisconnectionTime: sn(c.rcdDisconnectionTime, c.rcdMs),
    afddTestButton: Boolean(c.afddTestButton ?? false),
    afddManualTest: Boolean(c.afddManualTest ?? false),
    status: s(c.status),
    observationCode: sn(c.observationCode, c.code),
  };
}

// ── EIC-specific signatory section ──

export const signatoryBlockSchema = z.object({
  name: z.string().optional().default(""),
  qualifications: z.string().optional().default(""),
  registrationNumber: z.string().optional().default(""),
  dateSigned: z.string().optional().default(""),
  complianceConfirmed: z.boolean().optional().default(false),
  signature: z.custom<CertificateSignature>().optional(),
});

// ── EIC Certificate schema (expanded) ──

export const eicCertificateSchema = z.object({
  type: z.literal("EIC"),
  overview: overviewSchema,
  contractorDetails: contractorDetailsSchema.optional().default({}),
  supplyCharacteristics: supplyCharacteristicsSchema,
  earthingArrangements: earthingArrangementsSchema,
  testResults: testResultsSchema,
  scheduleOfCircuits: z.array(circuitSchema).optional().default([]),
  observations: z.string().optional().default(""),
  // EIC-specific fields
  installationType: z.enum(["new", "addition", "alteration", ""]).optional().default(""),
  commentsOnExistingInstallation: z.string().optional().default(""),
  boards: z.array(boardDataSchema).optional().default([]),
  nextInspectionDate: z.string().optional().default(""),
  retestInterval: z.string().optional().default(""),
  // Particulars of installation at origin
  originMainSwitchType: z.string().optional().default(""),
  originMainSwitchRating: z.string().optional().default(""),
  originMainSwitchBsEn: z.string().optional().default(""),
  originMainSwitchPoles: z.string().optional().default(""),
  originMainSwitchLocation: z.string().optional().default(""),
  // EIC signatory sections
  designSection: signatoryBlockSchema.optional().default({}),
  constructionSection: signatoryBlockSchema.optional().default({}),
  inspectionSection: signatoryBlockSchema.optional().default({}),
  sameAsDesigner: z.boolean().optional().default(false),
  declaration: z.object({
    designerSignature: z.custom<CertificateSignature>().optional(),
    installerSignature: z.custom<CertificateSignature>().optional(),
    inspectorSignature: z.custom<CertificateSignature>().optional(),
  }).optional().default({}),
});

// ── EICR Certificate schema (expanded) ──

export const eicrCertificateSchema = z.object({
  type: z.literal("EICR"),
  overview: overviewSchema,
  contractorDetails: contractorDetailsSchema.optional().default({}),
  extentAndLimitations: extentAndLimitationsSchema.optional().default({}),
  supplyCharacteristics: supplyCharacteristicsSchema,
  earthingArrangements: earthingArrangementsSchema,
  testResults: testResultsSchema,
  scheduleOfCircuits: z.array(circuitSchema).optional().default([]),
  // BS 7671 inspection checklist
  generalInspection: z.array(generalInspectionItemSchema).optional().default([]),
  // Distribution boards
  boards: z.array(boardDataSchema).optional().default([]),
  // Test instruments (certificate-level)
  testInstruments: testInstrumentsSchema.optional().default({}),
  // Observations
  observations: z.array(eicrObservationSchema).optional().default([]),
  // Summary of condition (auto-calculated)
  summaryOfCondition: summaryOfConditionSchema.optional().default({}),
  // Overall assessment
  overallCondition: z.enum(["satisfactory", "unsatisfactory", "further_investigation", ""]).optional().default(""),
  recommendedRetestDate: z.string().optional().default(""),
  retestInterval: z.string().optional().default(""),
  inspectorComments: z.string().optional().default(""),
  // Declaration & acknowledgement
  declarationDetails: declarationSchema.optional().default({}),
  clientAcknowledgement: clientAcknowledgementSchema.optional().default({}),
  declaration: z.object({
    inspectorSignature: z.custom<CertificateSignature>().optional(),
  }).optional().default({}),
});

// ── MWC Certificate schema (expanded) ──

export const mwcCertificateSchema = z.object({
  type: z.literal("MWC"),
  overview: overviewSchema,
  contractorDetails: contractorDetailsSchema.optional().default({}),
  workDescription: z.string().optional().default(""),
  // Expanded circuit details
  circuitDetails: z.object({
    circuitAffected: z.string().optional().default(""),
    protectiveDevice: z.string().optional().default(""),
    rating: z.string().optional().default(""),
    location: z.string().optional().default(""),
    circuitReference: z.string().optional().default(""),
    bsEnNumber: z.string().optional().default(""),
    cableReference: z.string().optional().default(""),
    cableCsaLive: z.string().optional().default(""),
    cableCsaCpc: z.string().optional().default(""),
    meansOfProtection: z.enum([
      "MCB", "RCBO", "Fuse_BS3036", "Fuse_BS1361", "Fuse_BS88", "Other", ""
    ]).optional().default(""),
  }).optional().default({}),
  extentOfWork: z.enum([
    "addition_to_circuit", "repair", "replacement", "other", ""
  ]).optional().default(""),
  partOfInstallation: z.string().optional().default(""),
  // Expanded test results
  testResults: z.object({
    continuity: z.string().optional().default(""),
    insulationResistance: z.string().optional().default(""),
    insulationResistanceLE: z.string().optional().default(""),
    insulationResistanceLN: z.string().optional().default(""),
    polarityConfirmed: z.boolean().optional().default(false),
    earthFaultLoopImpedance: z.string().optional().default(""),
    rcdOperatingTime: z.string().optional().default(""),
    rcdOperatingCurrent: z.string().optional().default(""),
    rcdType: z.enum(["AC", "A", "B", "F", ""]).optional().default(""),
    r2: z.string().optional().default(""),
    testButtonOperates: z.boolean().optional().default(false),
    // Ring circuit fields
    ringContinuityR1: z.string().optional().default(""),
    ringContinuityRn: z.string().optional().default(""),
    ringContinuityR2: z.string().optional().default(""),
  }).optional().default({}),
  observations: z.string().optional().default(""),
  nextInspectionDate: z.string().optional().default(""),
  // Declaration
  declarationDetails: declarationSchema.optional().default({}),
  declaration: z.object({
    installerSignature: z.custom<CertificateSignature>().optional(),
  }).optional().default({}),
});

// ── Fire Alarm Certificate schema (BS 5839) ──

const fireAlarmDeviceSchema = z.object({
  location: z.string().optional().default(""),
  deviceType: z.string().optional().default(""),
  zone: z.string().optional().default(""),
  status: z.enum(["pass", "fail", ""]).optional().default(""),
  notes: z.string().optional().default(""),
});

export const fireAlarmCertificateSchema = z.object({
  type: z.literal("FIRE"),
  overview: overviewSchema,
  contractorDetails: contractorDetailsSchema.optional().default({}),
  systemDetails: z.object({
    systemType: z.enum(["L1", "L2", "L3", "L4", "L5", "M", "P1", "P2", ""]).optional().default(""),
    panelManufacturer: z.string().optional().default(""),
    panelModel: z.string().optional().default(""),
    panelLocation: z.string().optional().default(""),
    numberOfZones: z.string().optional().default(""),
    numberOfDevices: z.string().optional().default(""),
    batteryBackup: z.boolean().optional().default(false),
    batteryType: z.string().optional().default(""),
    batteryCapacity: z.string().optional().default(""),
  }).optional().default({}),
  devices: z.array(fireAlarmDeviceSchema).optional().default([]),
  testResults: z.object({
    panelFunctional: z.boolean().optional().default(false),
    soundersAudible: z.boolean().optional().default(false),
    remoteSoundersAudible: z.boolean().optional().default(false),
    batteryVoltage: z.string().optional().default(""),
    batteryCondition: z.enum(["good", "fair", "replace", ""]).optional().default(""),
    allDevicesTested: z.boolean().optional().default(false),
    faultIndicatorsTested: z.boolean().optional().default(false),
    zonesLabelled: z.boolean().optional().default(false),
    logBookAvailable: z.boolean().optional().default(false),
  }).optional().default({}),
  observations: z.array(z.object({
    code: z.string().optional().default(""),
    observation: z.string().optional().default(""),
    recommendation: z.string().optional().default(""),
    location: z.string().optional().default(""),
  })).optional().default([]),
  overallCondition: z.enum(["satisfactory", "unsatisfactory", ""]).optional().default(""),
  nextServiceDate: z.string().optional().default(""),
  declaration: z.object({
    engineerSignature: z.custom<CertificateSignature>().optional(),
  }).optional().default({}),
});

// ── Emergency Lighting Certificate schema (BS 5266) ──

const emergencyLightSchema = z.object({
  location: z.string().optional().default(""),
  type: z.enum(["self-contained", "central-battery", "combined", ""]).optional().default(""),
  luminaireType: z.string().optional().default(""),
  duration: z.string().optional().default(""),
  status: z.enum(["pass", "fail", ""]).optional().default(""),
  notes: z.string().optional().default(""),
});

export const emergencyLightingCertificateSchema = z.object({
  type: z.literal("EML"),
  overview: overviewSchema,
  contractorDetails: contractorDetailsSchema.optional().default({}),
  systemDetails: z.object({
    systemType: z.enum(["maintained", "non-maintained", "sustained", "combined", ""]).optional().default(""),
    riskAssessmentRef: z.string().optional().default(""),
    escapeLighting: z.boolean().optional().default(false),
    standbyLighting: z.boolean().optional().default(false),
    highRiskTaskLighting: z.boolean().optional().default(false),
    numberOfLuminaires: z.string().optional().default(""),
    designDuration: z.string().optional().default(""),
    centralBatteryLocation: z.string().optional().default(""),
  }).optional().default({}),
  luminaires: z.array(emergencyLightSchema).optional().default([]),
  testResults: z.object({
    functionalTestDate: z.string().optional().default(""),
    fullDurationTestDate: z.string().optional().default(""),
    durationTestResult: z.enum(["pass", "fail", ""]).optional().default(""),
    actualDuration: z.string().optional().default(""),
    allLuminairesFunctional: z.boolean().optional().default(false),
    exitSignsVisible: z.boolean().optional().default(false),
    illuminationAdequate: z.boolean().optional().default(false),
    logBookAvailable: z.boolean().optional().default(false),
  }).optional().default({}),
  observations: z.array(z.object({
    code: z.string().optional().default(""),
    observation: z.string().optional().default(""),
    recommendation: z.string().optional().default(""),
    location: z.string().optional().default(""),
  })).optional().default([]),
  overallCondition: z.enum(["satisfactory", "unsatisfactory", ""]).optional().default(""),
  nextServiceDate: z.string().optional().default(""),
  declaration: z.object({
    engineerSignature: z.custom<CertificateSignature>().optional(),
  }).optional().default({}),
});

// Union of all certificate types
export const certificateDataSchema = z.union([
  eicCertificateSchema,
  eicrCertificateSchema,
  mwcCertificateSchema,
  fireAlarmCertificateSchema,
  emergencyLightingCertificateSchema,
]);
export type CertificateData = z.infer<typeof certificateDataSchema>;

export type EICCertificate = z.infer<typeof eicCertificateSchema>;
export type EICRCertificate = z.infer<typeof eicrCertificateSchema>;
export type MWCCertificate = z.infer<typeof mwcCertificateSchema>;
export type FireAlarmCertificate = z.infer<typeof fireAlarmCertificateSchema>;
export type EmergencyLightingCertificate = z.infer<typeof emergencyLightingCertificateSchema>;
export type BoardData = z.infer<typeof boardDataSchema>;
export type BoardCircuit = z.infer<typeof boardCircuitSchema>;
export type TestInstruments = z.infer<typeof testInstrumentsSchema>;

// Get empty template for a certificate type
export function getCertificateTemplate(type: CertificateType): CertificateData {
  const now = new Date().toISOString().split("T")[0];

  switch (type) {
    case "EIC":
      return eicCertificateSchema.parse({
        type: "EIC",
        overview: { dateOfInspection: now },
        contractorDetails: {},
        supplyCharacteristics: {},
        earthingArrangements: {},
        testResults: {},
        scheduleOfCircuits: [],
        observations: "",
        installationType: "",
        boards: [],
        designSection: {},
        constructionSection: {},
        inspectionSection: {},
        declaration: {},
      });
    case "EICR":
      return eicrCertificateSchema.parse({
        type: "EICR",
        overview: { dateOfInspection: now },
        contractorDetails: {},
        extentAndLimitations: {},
        supplyCharacteristics: {},
        earthingArrangements: {},
        testResults: {},
        scheduleOfCircuits: [],
        generalInspection: [],
        boards: [],
        testInstruments: {},
        observations: [],
        summaryOfCondition: {},
        overallCondition: "",
        recommendedRetestDate: "",
        declarationDetails: {},
        clientAcknowledgement: {},
        declaration: {},
      });
    case "MWC":
      return mwcCertificateSchema.parse({
        type: "MWC",
        overview: { dateOfInspection: now },
        contractorDetails: {},
        workDescription: "",
        circuitDetails: {},
        testResults: {},
        observations: "",
        declarationDetails: {},
        declaration: {},
      });
    case "FIRE":
      return fireAlarmCertificateSchema.parse({
        type: "FIRE",
        overview: { dateOfInspection: now },
        contractorDetails: {},
        systemDetails: {},
        devices: [],
        testResults: {},
        observations: [],
        overallCondition: "",
        nextServiceDate: "",
        declaration: {},
      });
    case "EML":
      return emergencyLightingCertificateSchema.parse({
        type: "EML",
        overview: { dateOfInspection: now },
        contractorDetails: {},
        systemDetails: {},
        luminaires: [],
        testResults: {},
        observations: [],
        overallCondition: "",
        nextServiceDate: "",
        declaration: {},
      });
  }
}

// Re-export the config-driven type registry
export {
  CERTIFICATE_TYPE_REGISTRY,
  validateFromRegistry,
  getTypeConfig,
  getTypeSections,
  getRequiredSections,
  getTypeFeatures,
  getTypeSignatures,
  getTypeValidationRules,
  typeHasSection,
  getTypesByCategory,
  getAllRegisteredTypes,
} from "./certificate-registry";
export type {
  CertificateTypeConfig,
  CertificateSectionConfig,
  CertificateFeatures,
  CertificateSignatureConfig,
  ValidationRule,
  RegistryValidationResult,
  RegistryValidationError,
} from "./certificate-registry";

// Re-export the workflow engine (CERT-A14)
export {
  getCertificateSteps,
  getStepRules,
  validateStep,
  canAdvanceStep,
  getNextIncompleteStep,
  getCompletedSteps,
  getWorkflowProgress,
  getStepBySection,
  getNextStep,
  getPreviousStep,
} from "./certificate-workflow";
export type {
  WorkflowStep,
  StepValidationResult,
  WorkflowProgress,
} from "./certificate-workflow";

// Re-export the lifecycle state machine (CERT-A16)
export {
  deriveLifecycleState,
  derivePreCompletionState,
  canTransition,
  getAvailableTransitions,
  canComplete,
  canLock,
  getStateInfo,
  isEditable,
  fromCrmStatus,
  toCrmStatus,
  toOfflineStatus,
} from "./certificate-lifecycle";
export type {
  LifecycleState,
  StoredLifecycleState,
  TransitionResult,
  LifecycleStateInfo,
} from "./certificate-lifecycle";
