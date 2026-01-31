import { z } from "zod";

/** Slug identifier for each tool — used as URL path segment and DB key */
export type ToolSlug =
  | "voltage-drop"
  | "cable-sizing"
  | "conduit-fill"
  | "conduit-bending"
  | "adiabatic"
  | "max-demand"
  | "residential-load"
  | "box-fill"
  | "energy-roi"
  | "motor-fla"
  | "transformer-sizing"
  | "power-factor"
  | "fault-level"
  | "lumen-method"
  | "high-bay-planner"
  | "ugr-calculator"
  | "metal-prices"
  | "rams-generator"
  | "safety-assessment";

export type ToolCategory =
  | "core"
  | "residential"
  | "industrial"
  | "lighting"
  | "rams"
  | "reference";

export interface ToolDefinition {
  slug: ToolSlug;
  name: string;
  shortDescription: string;
  category: ToolCategory;
  /** Which standards this tool supports */
  standards: ("BS 7671" | "NEC" | "IEC")[];
  /** Icon name from lucide-react */
  icon: string;
  /** Whether this is an estimator (shows "Estimator Mode" badge) */
  estimatorMode?: boolean;
  /** External link instead of internal tool page */
  externalHref?: string;
}

export const TOOL_CATEGORIES: Record<ToolCategory, { label: string; description: string }> = {
  core: { label: "Core Installation & Field Calculators", description: "Essential calculations for everyday electrical work" },
  residential: { label: "Residential & Commercial Design", description: "Load analysis and energy planning tools" },
  industrial: { label: "Industrial & Power Systems", description: "Motor, transformer, and power system calculations" },
  lighting: { label: "Lighting Design", description: "Luminaire planning and glare assessment" },
  rams: { label: "RAMS & Safety Assessments", description: "Risk assessments and method statements" },
  reference: { label: "Reference & Business Helpers", description: "Pricing, certificates, and estimating" },
};

export const TOOLS: ToolDefinition[] = [
  // Core
  { slug: "voltage-drop", name: "Voltage Drop Calculator", shortDescription: "Calculate voltage drop for circuit design to BS 7671 limits", category: "core", standards: ["BS 7671"], icon: "Zap" },
  { slug: "cable-sizing", name: "Cable Sizing & Ampacity", shortDescription: "Select cable size with correction factors and current ratings", category: "core", standards: ["BS 7671"], icon: "Cable" },
  { slug: "conduit-fill", name: "Conduit Fill & Sizing", shortDescription: "Check conduit fill percentage against BS 7671 / NEC limits", category: "core", standards: ["BS 7671", "NEC"], icon: "CircleDot" },
  { slug: "conduit-bending", name: "Conduit Bending Helper", shortDescription: "Calculate bend marks for offset, saddle, and 90-degree bends", category: "core", standards: ["BS 7671"], icon: "Waypoints" },
  { slug: "adiabatic", name: "Adiabatic Equation (CPC Sizing)", shortDescription: "Calculate minimum CPC cross-section using the adiabatic equation", category: "core", standards: ["BS 7671"], icon: "Shield" },
  // Residential
  { slug: "max-demand", name: "Maximum Demand & Diversity", shortDescription: "Estimate maximum demand with configurable diversity profiles", category: "residential", standards: ["BS 7671"], icon: "BarChart3" },
  { slug: "residential-load", name: "Residential Load Calculator", shortDescription: "Calculate total load and suggest service size (80/100/200A)", category: "residential", standards: ["BS 7671"], icon: "Home" },
  { slug: "box-fill", name: "Box Fill Calculator", shortDescription: "Check enclosure fill against wiring regulations", category: "residential", standards: ["BS 7671", "NEC"], icon: "Box" },
  { slug: "energy-roi", name: "Energy Cost & ROI Estimator", shortDescription: "Compare LED upgrade costs, savings, and payback period", category: "residential", standards: [], icon: "TrendingUp" },
  // Industrial
  { slug: "motor-fla", name: "Motor FLA Calculator", shortDescription: "Full-load amps for 1-phase and 3-phase motors with cable suggestions", category: "industrial", standards: ["BS 7671", "IEC"], icon: "Cog" },
  { slug: "transformer-sizing", name: "Transformer Sizing Tool", shortDescription: "Calculate kVA rating, currents, and protection sizing", category: "industrial", standards: ["BS 7671", "IEC"], icon: "Layers" },
  { slug: "power-factor", name: "Power Factor Correction", shortDescription: "Calculate kVAR required and before/after current comparison", category: "industrial", standards: ["IEC"], icon: "Activity" },
  { slug: "fault-level", name: "Short-Circuit & Fault Level", shortDescription: "Estimate prospective fault current using Zs method", category: "industrial", standards: ["BS 7671"], icon: "AlertTriangle", estimatorMode: true },
  // Lighting
  { slug: "lumen-method", name: "Luminaire Quantity & Spacing", shortDescription: "Lumen method calculation for required luminaire count", category: "lighting", standards: ["BS 7671"], icon: "Lightbulb" },
  { slug: "high-bay-planner", name: "Warehouse & High-Bay Planner", shortDescription: "Mount height and spacing-to-height ratio guidance", category: "lighting", standards: [], icon: "Warehouse" },
  { slug: "ugr-calculator", name: "UGR Calculator", shortDescription: "Unified Glare Rating estimator for lighting comfort", category: "lighting", standards: ["IEC"], icon: "Eye", estimatorMode: true },
  // RAMS
  { slug: "rams-generator", name: "RAMS Generator", shortDescription: "Create risk assessments and method statements with versioning", category: "rams", standards: [], icon: "FileWarning" },
  { slug: "safety-assessment", name: "Safety Assessment Checklist", shortDescription: "Structured safety checklist with sign-off and PDF export", category: "rams", standards: [], icon: "ClipboardCheck" },
  // Reference
  { slug: "metal-prices", name: "Live Metal Price Tracker", shortDescription: "Copper and aluminium spot prices with trend data", category: "reference", standards: [], icon: "Coins" },
];

/** All valid tool slugs as a const array for Zod enum */
export const TOOL_SLUGS = [
  "voltage-drop", "cable-sizing", "conduit-fill", "conduit-bending", "adiabatic",
  "max-demand", "residential-load", "box-fill", "energy-roi",
  "motor-fla", "transformer-sizing", "power-factor", "fault-level",
  "lumen-method", "high-bay-planner", "ugr-calculator",
  "metal-prices", "rams-generator", "safety-assessment",
] as const satisfies readonly ToolSlug[];

/** Zod schema for the ToolPreset model inputs */
export const toolPresetSchema = z.object({
  toolSlug: z.enum(TOOL_SLUGS),
  name: z.string().min(1).max(100),
  inputsJson: z.record(z.unknown()).refine(
    (v) => JSON.stringify(v).length <= 32_000,
    { message: "Preset data too large (max 32 KB)" },
  ),
});
