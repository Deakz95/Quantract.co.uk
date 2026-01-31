/**
 * Lead scoring engine.
 * Scores enquiries based on keyword matches + rule-based boosts.
 * Pure logic — no DB calls; caller provides config + enquiry data.
 */

export interface KeywordRule {
  keyword: string;
  points: number;
}

export interface BoostRule {
  field: "source" | "postcode" | "valueEstimate";
  condition: "equals" | "contains" | "gte" | "lte";
  value: string;
  points: number;
}

export interface LeadScoringConfigData {
  keywords: KeywordRule[];
  priorityThresholds: {
    high: number;   // score >= this → high
    urgent: number; // score >= this → urgent
  };
  boostRules?: BoostRule[];
}

export interface ScoringInput {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  notes?: string | null;
  postcode?: string | null;
  source?: string | null;
  valueEstimate?: number | null;
}

export interface ScoringResult {
  score: number;
  priority: "low" | "normal" | "high" | "urgent";
  reason: {
    keywords: { keyword: string; points: number }[];
    boosts: { rule: string; points: number }[];
  };
}

export const DEFAULT_CONFIG: LeadScoringConfigData = {
  keywords: [
    { keyword: "emergency", points: 20 },
    { keyword: "urgent", points: 15 },
    { keyword: "asap", points: 15 },
    { keyword: "rewire", points: 10 },
    { keyword: "consumer unit", points: 10 },
    { keyword: "fuse board", points: 10 },
    { keyword: "ev charger", points: 8 },
    { keyword: "solar", points: 8 },
    { keyword: "commercial", points: 8 },
    { keyword: "new build", points: 7 },
    { keyword: "fire alarm", points: 7 },
    { keyword: "testing", points: 5 },
    { keyword: "eicr", points: 5 },
    { keyword: "certificate", points: 4 },
    { keyword: "quote", points: 3 },
  ],
  priorityThresholds: {
    high: 15,
    urgent: 30,
  },
};

/**
 * Score an enquiry against the given config.
 */
export function scoreEnquiry(input: ScoringInput, config: LeadScoringConfigData): ScoringResult {
  const searchableText = [
    input.name,
    input.email,
    input.message,
    input.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Keyword matches
  const keywordHits: { keyword: string; points: number }[] = [];
  for (const rule of config.keywords) {
    if (searchableText.includes(rule.keyword.toLowerCase())) {
      keywordHits.push({ keyword: rule.keyword, points: rule.points });
    }
  }

  // Boost rules
  const boostHits: { rule: string; points: number }[] = [];
  for (const boost of config.boostRules ?? []) {
    const fieldValue = input[boost.field];
    if (fieldValue == null) continue;

    let matched = false;
    const strVal = String(fieldValue).toLowerCase();
    const condVal = boost.value.toLowerCase();

    switch (boost.condition) {
      case "equals":
        matched = strVal === condVal;
        break;
      case "contains":
        matched = strVal.includes(condVal);
        break;
      case "gte":
        matched = typeof fieldValue === "number" && fieldValue >= Number(boost.value);
        break;
      case "lte":
        matched = typeof fieldValue === "number" && fieldValue <= Number(boost.value);
        break;
    }

    if (matched) {
      boostHits.push({ rule: `${boost.field} ${boost.condition} ${boost.value}`, points: boost.points });
    }
  }

  // Has phone number → small boost
  if (input.phone && input.phone.trim().length > 5) {
    boostHits.push({ rule: "has phone number", points: 3 });
  }

  // Has value estimate → boost
  if (input.valueEstimate && input.valueEstimate > 0) {
    const vPoints = input.valueEstimate >= 5000 ? 10 : input.valueEstimate >= 1000 ? 5 : 2;
    boostHits.push({ rule: `value estimate £${input.valueEstimate}`, points: vPoints });
  }

  const score = keywordHits.reduce((s, h) => s + h.points, 0) +
    boostHits.reduce((s, h) => s + h.points, 0);

  const thresholds = config.priorityThresholds;
  let priority: ScoringResult["priority"] = "normal";
  if (score >= thresholds.urgent) priority = "urgent";
  else if (score >= thresholds.high) priority = "high";
  else if (score <= 0) priority = "low";

  return { score, priority, reason: { keywords: keywordHits, boosts: boostHits } };
}
