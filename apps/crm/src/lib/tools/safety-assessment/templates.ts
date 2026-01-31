import type { CheckCategory } from "./schema";

export const DEFAULT_SAFETY_CATEGORIES: CheckCategory[] = [
  {
    category: "Electrical Safety",
    checks: [
      { item: "Distribution boards are secured and labelled", status: "na", notes: "" },
      { item: "No exposed live conductors or damaged cables", status: "na", notes: "" },
      { item: "RCDs tested and operational (within last 3 months)", status: "na", notes: "" },
      { item: "Portable appliances have valid PAT test labels", status: "na", notes: "" },
      { item: "Temporary supplies are protected by 30mA RCD", status: "na", notes: "" },
      { item: "Isolation points clearly identified and accessible", status: "na", notes: "" },
      { item: "Lock-off equipment available and in use", status: "na", notes: "" },
      { item: "Electrical installation certificate / EICR in date", status: "na", notes: "" },
    ],
  },
  {
    category: "Working at Height",
    checks: [
      { item: "Ladders inspected and in good condition", status: "na", notes: "" },
      { item: "Scaffolding has valid inspection tag (within 7 days)", status: "na", notes: "" },
      { item: "Edge protection in place at open edges above 2m", status: "na", notes: "" },
      { item: "MEWPs have current LOLER certificate", status: "na", notes: "" },
      { item: "Operatives have completed working at height training", status: "na", notes: "" },
    ],
  },
  {
    category: "Fire Safety",
    checks: [
      { item: "Fire extinguishers in date and accessible", status: "na", notes: "" },
      { item: "Escape routes clear and signposted", status: "na", notes: "" },
      { item: "Hot works permit in place where required", status: "na", notes: "" },
      { item: "Flammable materials stored correctly", status: "na", notes: "" },
      { item: "Fire alarm tested and operational", status: "na", notes: "" },
    ],
  },
  {
    category: "General Site Safety",
    checks: [
      { item: "Site induction completed for all personnel", status: "na", notes: "" },
      { item: "Correct PPE worn by all operatives", status: "na", notes: "" },
      { item: "First aid kit available and stocked", status: "na", notes: "" },
      { item: "Welfare facilities adequate (toilet, water, rest area)", status: "na", notes: "" },
      { item: "Housekeeping satisfactory — work area tidy", status: "na", notes: "" },
      { item: "COSHH assessments available for substances in use", status: "na", notes: "" },
    ],
  },
];

export const SAFETY_ASSESSMENT_TEMPLATE = {
  name: "Standard Site Safety Assessment",
  description: "Comprehensive site safety checklist covering electrical, working at height, fire, and general safety",
  categories: DEFAULT_SAFETY_CATEGORIES,
};
