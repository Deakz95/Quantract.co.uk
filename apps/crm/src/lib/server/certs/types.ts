/**
 * Certificate type metadata registry.
 * Single source of truth for all supported certificate types.
 */

export const CERTIFICATE_TYPES_V2 = [
  // Electrical (BS 7671)
  "EIC",
  "EICR",
  "MWC",
  // Fire (BS 5839)
  "FIRE_DESIGN",
  "FIRE_INSTALLATION",
  "FIRE_COMMISSIONING",
  "FIRE_INSPECTION_SERVICING",
  // Emergency Lighting (BS 5266)
  "EL_COMPLETION",
  "EL_PERIODIC",
  // Solar PV (MCS / IEC)
  "SOLAR_INSTALLATION",
  "SOLAR_TEST_REPORT",
  "SOLAR_HANDOVER",
] as const;

export type CertificateTypeV2 = (typeof CERTIFICATE_TYPES_V2)[number];

export type TypeCategory = "electrical" | "fire" | "emergency_lighting" | "solar_pv";

export type CertTypeMetadata = {
  type: CertificateTypeV2;
  displayName: string;
  shortName: string;
  category: TypeCategory;
  standard: string;
  requiredSignatureRoles: string[];
  checklistSections: string[];
};

const META: Record<CertificateTypeV2, CertTypeMetadata> = {
  EIC: {
    type: "EIC",
    displayName: "Electrical Installation Certificate",
    shortName: "EIC",
    category: "electrical",
    standard: "BS 7671",
    requiredSignatureRoles: ["engineer", "customer"],
    checklistSections: ["visual_inspection", "testing"],
  },
  EICR: {
    type: "EICR",
    displayName: "Electrical Installation Condition Report",
    shortName: "EICR",
    category: "electrical",
    standard: "BS 7671",
    requiredSignatureRoles: ["engineer", "customer"],
    checklistSections: ["visual_inspection", "testing", "assessment"],
  },
  MWC: {
    type: "MWC",
    displayName: "Minor Electrical Installation Works Certificate",
    shortName: "MWC",
    category: "electrical",
    standard: "BS 7671",
    requiredSignatureRoles: ["engineer", "customer"],
    checklistSections: ["visual_inspection", "testing"],
  },
  FIRE_DESIGN: {
    type: "FIRE_DESIGN",
    displayName: "Fire Detection & Alarm — Design Certificate",
    shortName: "Fire Design",
    category: "fire",
    standard: "BS 5839-1",
    requiredSignatureRoles: ["designer", "customer"],
    checklistSections: ["design_criteria", "zone_plan", "device_schedule"],
  },
  FIRE_INSTALLATION: {
    type: "FIRE_INSTALLATION",
    displayName: "Fire Detection & Alarm — Installation Certificate",
    shortName: "Fire Installation",
    category: "fire",
    standard: "BS 5839-1",
    requiredSignatureRoles: ["engineer", "customer"],
    checklistSections: ["installation_checks", "wiring", "device_mounting"],
  },
  FIRE_COMMISSIONING: {
    type: "FIRE_COMMISSIONING",
    displayName: "Fire Detection & Alarm — Commissioning Certificate",
    shortName: "Fire Commissioning",
    category: "fire",
    standard: "BS 5839-1",
    requiredSignatureRoles: ["engineer", "customer"],
    checklistSections: ["zone_tests", "detection_coverage", "sounder_levels", "cause_and_effect"],
  },
  FIRE_INSPECTION_SERVICING: {
    type: "FIRE_INSPECTION_SERVICING",
    displayName: "Fire Detection & Alarm — Inspection & Servicing Certificate",
    shortName: "Fire Inspection",
    category: "fire",
    standard: "BS 5839-1",
    requiredSignatureRoles: ["engineer", "customer"],
    checklistSections: ["visual_inspection", "functional_tests", "panel_checks", "detector_tests"],
  },
  EL_COMPLETION: {
    type: "EL_COMPLETION",
    displayName: "Emergency Lighting — Completion Certificate",
    shortName: "EL Completion",
    category: "emergency_lighting",
    standard: "BS 5266-1",
    requiredSignatureRoles: ["engineer", "customer"],
    checklistSections: ["luminaire_schedule", "duration_test", "lux_levels"],
  },
  EL_PERIODIC: {
    type: "EL_PERIODIC",
    displayName: "Emergency Lighting — Periodic Inspection Certificate",
    shortName: "EL Periodic",
    category: "emergency_lighting",
    standard: "BS 5266-1",
    requiredSignatureRoles: ["engineer", "customer"],
    checklistSections: ["luminaire_schedule", "duration_test", "lux_levels", "functional_test"],
  },
  SOLAR_INSTALLATION: {
    type: "SOLAR_INSTALLATION",
    displayName: "Solar PV Installation Certificate",
    shortName: "Solar Install",
    category: "solar_pv",
    standard: "MCS / IEC 62446",
    requiredSignatureRoles: ["engineer", "customer"],
    checklistSections: ["module_mounting", "dc_wiring", "inverter", "earthing", "ac_connection"],
  },
  SOLAR_TEST_REPORT: {
    type: "SOLAR_TEST_REPORT",
    displayName: "Solar PV Test Report",
    shortName: "Solar Test",
    category: "solar_pv",
    standard: "IEC 62446",
    requiredSignatureRoles: ["engineer"],
    checklistSections: ["string_tests", "insulation_resistance", "earth_continuity", "polarity"],
  },
  SOLAR_HANDOVER: {
    type: "SOLAR_HANDOVER",
    displayName: "Solar PV Handover Pack Checklist",
    shortName: "Solar Handover",
    category: "solar_pv",
    standard: "MCS",
    requiredSignatureRoles: ["engineer", "customer"],
    checklistSections: ["documentation", "user_training", "warranty_info", "grid_compliance"],
  },
};

export function getCertTypeMetadata(type: string): CertTypeMetadata | null {
  return META[type as CertificateTypeV2] ?? null;
}

export function getTypeCategory(type: string): TypeCategory | null {
  return META[type as CertificateTypeV2]?.category ?? null;
}

export function isValidCertType(type: string): type is CertificateTypeV2 {
  return type in META;
}

export function getAllCertTypes(): CertTypeMetadata[] {
  return Object.values(META);
}
