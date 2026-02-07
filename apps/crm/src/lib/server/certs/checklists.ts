/**
 * Default checklist templates per certificate type.
 * Used to populate CertificateChecklist rows on cert creation.
 */

import type { CertificateTypeV2 } from "./types";

export type ChecklistItem = {
  section: string;
  question: string;
  sortOrder: number;
  itemCode?: string;
};

function items(section: string, questions: string[], codePrefix?: string): ChecklistItem[] {
  return questions.map((q, i) => ({
    section,
    question: q,
    sortOrder: i,
    itemCode: codePrefix ? `${codePrefix}.${i + 1}` : undefined,
  }));
}

// ── BS 7671:2018+A2:2022 Inspection Categories ──

const BS7671_SECTION_A = items("cu_distribution_board", [
  "Consumer unit/distribution board correctly identified and labelled",
  "Adequacy of working space and accessibility",
  "Security of fixing",
  "Condition of enclosure (no damage, appropriate IP rating)",
  "Suitability for the environment (IP rating)",
  "Presence of main switch/circuit breakers",
  "Correct type and rating of protective devices",
  "RCD protection where required by BS 7671",
  "SPD (Surge Protection Device) where required",
  "Adequacy of cable connections and terminations",
  "Presence of danger notices and warning labels",
], "A");

const BS7671_SECTION_B = items("wiring_systems", [
  "Identification of conductors",
  "Cables correctly supported and protected",
  "Condition of insulation of live parts",
  "Non-sheathed cables enclosed in conduit/trunking",
  "Correct selection of cable for current-carrying capacity and voltage drop",
  "Presence of fire barriers, seals and protection",
  "Cable routes do not compromise building structural integrity",
  "Cables concealed under floors/above ceilings correctly supported",
  "Condition of flexible cables and cord sets",
  "Adequacy of cables against external influences",
], "B");

const BS7671_SECTION_C = items("protection", [
  "Protection against direct contact (basic protection)",
  "Protection against indirect contact (fault protection)",
  "Protection against overcurrent",
  "SELV / PELV systems correctly installed",
  "Coordination between overcurrent protective devices",
  "Prospective fault current does not exceed device capability",
], "C");

const BS7671_SECTION_D = items("accessories_switchgear", [
  "Condition of accessories (socket-outlets, switches, etc.)",
  "Suitability of accessories for their environment",
  "Single-pole switching in line conductor only",
  "Adequacy of connections at accessories",
  "Provision of earthing and bonding at accessories",
], "D");

const BS7671_SECTION_E = items("special_locations", [
  "Bathroom/shower room zones correctly applied (BS 7671 Section 701)",
  "Swimming pool/spa requirements met (Section 702)",
  "Exterior lighting and power installations adequate (Section 714)",
  "Solar PV / generator installation compliant (Section 712/551)",
], "E");

// ── Electrical Testing ──

const ELECTRICAL_TESTING = items("testing", [
  "Continuity of protective conductors (R1 + R2)",
  "Continuity of ring final circuit conductors",
  "Insulation resistance (IR)",
  "Polarity",
  "Earth fault loop impedance (Zs)",
  "Prospective fault current (PSCC/PFC)",
  "RCD operation (trip time and current)",
  "Functional testing of switchgear and controls",
]);

const EICR_ASSESSMENT = items("assessment", [
  "Overall assessment of the electrical installation",
  "Condition of the installation since previous inspection",
  "Next recommended inspection date determined",
]);

// ── Fire (BS 5839) ──

const FIRE_DESIGN = items("design_criteria", [
  "System category confirmed (L1/L2/L3/L4/L5, P1/P2)",
  "Detection zones defined and documented",
  "Sounder zones defined and coverage adequate",
  "Detector types appropriate for environment",
  "Manual call point locations correct",
  "Panel location and access appropriate",
  "Cause and effect documented",
  "Standby power requirements met",
]);

const FIRE_ZONE_PLAN = items("zone_plan", [
  "Zone plan drawing provided",
  "Zone boundaries clearly defined",
  "Maximum zone area ≤ 2000m² (non-addressable)",
]);

const FIRE_DEVICE_SCHEDULE = items("device_schedule", [
  "Complete device schedule provided",
  "Device types match design specification",
  "Quantities verified against design",
]);

const FIRE_INSTALLATION_CHECKS = items("installation_checks", [
  "Cable types and sizes correct per design",
  "Cable routes fire-stopped where penetrating compartment walls/floors",
  "Cables segregated from other services where required",
  "Devices at correct mounting heights",
  "Detector spacing within limits for ceiling type",
]);

const FIRE_WIRING = items("wiring", [
  "Circuit wiring integrity verified",
  "Loop resistance within limits",
  "Earth fault monitoring operational",
  "Screened cable earthed at one end only",
]);

const FIRE_DEVICE_MOUNTING = items("device_mounting", [
  "Detectors clear of obstructions (minimum 500mm)",
  "MCPs at correct height (1.4m typical)",
  "Sounders/beacons at correct positions",
  "Panel securely mounted and accessible",
]);

const FIRE_ZONE_TESTS = items("zone_tests", [
  "Each zone activates correctly at panel",
  "Zone text/labels match site plan",
  "Walk test completed — all detectors verified",
]);

const FIRE_DETECTION_COVERAGE = items("detection_coverage", [
  "All areas within design category fully covered",
  "No blind spots identified",
  "Detector sensitivity appropriate for environment",
]);

const FIRE_SOUNDER_LEVELS = items("sounder_levels", [
  "Minimum 65dB(A) throughout occupied areas (75dB(A) in bedrooms)",
  "Sounder audibility at all locations confirmed",
  "Visual alarm devices operational where required",
]);

const FIRE_CAUSE_AND_EFFECT = items("cause_and_effect", [
  "Cause and effect matrix tested and verified",
  "Door holders release on alarm",
  "Damper control operates correctly",
  "Plant shutdown operates correctly",
]);

const FIRE_VISUAL_INSPECTION = items("visual_inspection", [
  "Panel in normal condition, no faults displayed",
  "All devices in correct position and undamaged",
  "Manual call points accessible and unobstructed",
  "Cable routes intact, no damage visible",
  "Battery condition satisfactory",
]);

const FIRE_FUNCTIONAL_TESTS = items("functional_tests", [
  "Detector function test (at least 25% per visit, 100% per year)",
  "Manual call point test (sample)",
  "Sounder/beacon function test",
  "Fault indication test at panel",
]);

const FIRE_PANEL_CHECKS = items("panel_checks", [
  "Event log reviewed",
  "Standby battery voltage satisfactory",
  "Battery load test satisfactory",
  "Software/configuration unchanged since commissioning",
]);

const FIRE_DETECTOR_TESTS = items("detector_tests", [
  "Smoke detectors tested with approved test equipment",
  "Heat detectors tested with approved test equipment",
  "Multi-sensor detectors tested appropriately",
  "Beam detectors alignment verified",
  "Aspirating system airflow confirmed",
]);

// ── Emergency Lighting (BS 5266) ──

const EL_LUMINAIRE_SCHEDULE = items("luminaire_schedule", [
  "Complete luminaire schedule provided",
  "All luminaires listed with location, type, and wattage",
  "Maintained and non-maintained types correctly identified",
]);

const EL_DURATION_TEST = items("duration_test", [
  "Full rated duration test completed (3 hours for emergency, 1 hour for standby)",
  "All luminaires operational at end of duration test",
  "Duration recorded for each luminaire",
]);

const EL_LUX_LEVELS = items("lux_levels", [
  "Minimum 1 lux along escape routes (centre line)",
  "Minimum 0.5 lux in open areas (anti-panic)",
  "Minimum 15 lux at high-risk task areas",
  "Uniformity ratio ≤ 40:1 along escape routes",
]);

const EL_FUNCTIONAL_TEST = items("functional_test", [
  "Monthly functional test completed",
  "All luminaires illuminate on test",
  "Charging indicators operational",
  "Test switch operation verified",
]);

// ── Solar PV (MCS / IEC 62446) ──

const SOLAR_MODULE_MOUNTING = items("module_mounting", [
  "Mounting system appropriate for roof type",
  "Structural assessment completed",
  "Module tilt and orientation as designed",
  "All fixings secure and weatherproof",
]);

const SOLAR_DC_WIRING = items("dc_wiring", [
  "DC cable type and size correct (solar rated)",
  "DC connectors are same manufacturer and model (no cross-matching)",
  "String wiring protected from mechanical damage",
  "DC isolator present and accessible",
]);

const SOLAR_INVERTER = items("inverter", [
  "Inverter location ventilated and accessible",
  "Inverter rating matches array design",
  "DC and AC connections torqued to spec",
  "Anti-islanding protection verified",
]);

const SOLAR_EARTHING = items("earthing", [
  "Module frame earthing connected",
  "Mounting system earthing connected",
  "Earth continuity verified",
  "Lightning protection considered",
]);

const SOLAR_AC_CONNECTION = items("ac_connection", [
  "AC connection to consumer unit correct",
  "AC isolator present and labelled",
  "Generation meter installed (if required)",
  "DNO notification completed",
]);

const SOLAR_STRING_TESTS = items("string_tests", [
  "Open circuit voltage (Voc) measured per string",
  "Short circuit current (Isc) measured per string",
  "Operating voltage and current recorded",
  "Values within expected range for irradiance",
]);

const SOLAR_IR = items("insulation_resistance", [
  "DC+ to earth insulation resistance measured",
  "DC- to earth insulation resistance measured",
  "Results ≥ 1.0 MΩ (minimum acceptable)",
]);

const SOLAR_EARTH_CONTINUITY = items("earth_continuity", [
  "Continuity of protective earth conductor verified",
  "All frame bonding connections tested",
]);

const SOLAR_POLARITY = items("polarity", [
  "DC polarity correct at all connection points",
  "AC polarity correct",
]);

const SOLAR_DOCUMENTATION = items("documentation", [
  "System design document provided",
  "Single line diagram provided",
  "Data sheets for modules, inverter, mounting",
  "EIC / Part P notification (if applicable)",
]);

const SOLAR_USER_TRAINING = items("user_training", [
  "Customer shown system monitoring",
  "Emergency shutdown procedure explained",
  "Maintenance requirements explained",
]);

const SOLAR_WARRANTY = items("warranty_info", [
  "Module warranty certificate provided",
  "Inverter warranty certificate provided",
  "Installer workmanship warranty provided",
  "MCS certificate provided (if applicable)",
]);

const SOLAR_GRID_COMPLIANCE = items("grid_compliance", [
  "G99/G98 application submitted to DNO",
  "DNO approval received",
  "Export limitation set (if required)",
  "Generation meter installed and commissioned",
]);

// ── Registry ──

const TEMPLATES: Record<string, ChecklistItem[]> = {
  // Electrical
  EIC: [
    ...BS7671_SECTION_A,
    ...BS7671_SECTION_B,
    ...BS7671_SECTION_C,
    ...BS7671_SECTION_D,
    ...BS7671_SECTION_E,
    ...ELECTRICAL_TESTING,
  ],
  EICR: [
    ...BS7671_SECTION_A,
    ...BS7671_SECTION_B,
    ...BS7671_SECTION_C,
    ...BS7671_SECTION_D,
    ...BS7671_SECTION_E,
    ...ELECTRICAL_TESTING,
    ...EICR_ASSESSMENT,
  ],
  MWC: [
    ...BS7671_SECTION_A,
    ...BS7671_SECTION_B,
    ...BS7671_SECTION_C,
    ...BS7671_SECTION_D,
    ...BS7671_SECTION_E,
    ...ELECTRICAL_TESTING,
  ],
  // Fire
  FIRE_DESIGN: [...FIRE_DESIGN, ...FIRE_ZONE_PLAN, ...FIRE_DEVICE_SCHEDULE],
  FIRE_INSTALLATION: [...FIRE_INSTALLATION_CHECKS, ...FIRE_WIRING, ...FIRE_DEVICE_MOUNTING],
  FIRE_COMMISSIONING: [...FIRE_ZONE_TESTS, ...FIRE_DETECTION_COVERAGE, ...FIRE_SOUNDER_LEVELS, ...FIRE_CAUSE_AND_EFFECT],
  FIRE_INSPECTION_SERVICING: [...FIRE_VISUAL_INSPECTION, ...FIRE_FUNCTIONAL_TESTS, ...FIRE_PANEL_CHECKS, ...FIRE_DETECTOR_TESTS],
  // Emergency Lighting
  EL_COMPLETION: [...EL_LUMINAIRE_SCHEDULE, ...EL_DURATION_TEST, ...EL_LUX_LEVELS],
  EL_PERIODIC: [...EL_LUMINAIRE_SCHEDULE, ...EL_DURATION_TEST, ...EL_LUX_LEVELS, ...EL_FUNCTIONAL_TEST],
  // Solar PV
  SOLAR_INSTALLATION: [...SOLAR_MODULE_MOUNTING, ...SOLAR_DC_WIRING, ...SOLAR_INVERTER, ...SOLAR_EARTHING, ...SOLAR_AC_CONNECTION],
  SOLAR_TEST_REPORT: [...SOLAR_STRING_TESTS, ...SOLAR_IR, ...SOLAR_EARTH_CONTINUITY, ...SOLAR_POLARITY],
  SOLAR_HANDOVER: [...SOLAR_DOCUMENTATION, ...SOLAR_USER_TRAINING, ...SOLAR_WARRANTY, ...SOLAR_GRID_COMPLIANCE],
};

export function getDefaultChecklist(type: string): ChecklistItem[] {
  return TEMPLATES[type] ?? [];
}
