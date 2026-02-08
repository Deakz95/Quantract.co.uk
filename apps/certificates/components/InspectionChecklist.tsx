"use client";

import { InspectionGroup } from "./ui/InspectionGroup";
import type { PillOption } from "./ui/PillSelector";

export interface InspectionItem {
  category: string;
  itemCode: string;
  description: string;
  outcome: string;
}

interface InspectionChecklistProps {
  items: InspectionItem[];
  onChange: (items: InspectionItem[]) => void;
}

const OUTCOME_PILLS: PillOption[] = [
  { label: "\u2713", value: "pass", color: "bg-emerald-600 text-white" },
  { label: "C1", value: "C1", color: "bg-red-600 text-white" },
  { label: "C2", value: "C2", color: "bg-amber-600 text-white" },
  { label: "C3", value: "C3", color: "bg-yellow-600 text-white" },
  { label: "N/A", value: "na", color: "bg-gray-600 text-white" },
  { label: "LIM", value: "lim", color: "bg-gray-600 text-white" },
];

const CATEGORY_LABELS: Record<string, string> = {
  cu_distribution_board: "A. Consumer Unit / Distribution Board",
  wiring_systems: "B. Wiring Systems",
  protection: "C. Protection",
  accessories_switchgear: "D. Accessories & Switchgear",
  special_locations: "E. Special Locations",
};

function formatCategoryName(category: string): string {
  return (
    CATEGORY_LABELS[category] ??
    category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function groupByCategory(items: InspectionItem[]): Map<string, InspectionItem[]> {
  const groups = new Map<string, InspectionItem[]>();
  for (const item of items) {
    const existing = groups.get(item.category);
    if (existing) existing.push(item);
    else groups.set(item.category, [item]);
  }
  return groups;
}

function getCategorySummary(categoryItems: InspectionItem[]) {
  const pass = categoryItems.filter((i) => i.outcome === "pass").length;
  const c1 = categoryItems.filter((i) => i.outcome === "C1").length;
  const c2 = categoryItems.filter((i) => i.outcome === "C2").length;
  const c3 = categoryItems.filter((i) => i.outcome === "C3").length;
  const na = categoryItems.filter((i) => i.outcome === "na").length;
  const lim = categoryItems.filter((i) => i.outcome === "lim").length;
  const unmarked = categoryItems.filter((i) => !i.outcome).length;
  const parts: string[] = [];
  if (pass > 0) parts.push(`${pass} pass`);
  if (c1 > 0) parts.push(`${c1} C1`);
  if (c2 > 0) parts.push(`${c2} C2`);
  if (c3 > 0) parts.push(`${c3} C3`);
  if (na > 0) parts.push(`${na} N/A`);
  if (lim > 0) parts.push(`${lim} LIM`);
  if (unmarked > 0) parts.push(`${unmarked} unmarked`);
  return parts.join(", ");
}

export function InspectionChecklist({ items, onChange }: InspectionChecklistProps) {
  const grouped = groupByCategory(items);

  const handleOutcomeChange = (itemCode: string, category: string, newOutcome: string) => {
    const updated = items.map((item) =>
      item.itemCode === itemCode && item.category === category
        ? { ...item, outcome: newOutcome }
        : item,
    );
    onChange(updated);
  };

  const handleMarkAllNA = (category: string) => {
    const updated = items.map((item) =>
      item.category === category ? { ...item, outcome: "na" } : item,
    );
    onChange(updated);
  };

  // Overall counts
  const totalItems = items.length;
  const passCount = items.filter((i) => i.outcome === "pass").length;
  const c1Count = items.filter((i) => i.outcome === "C1").length;
  const c2Count = items.filter((i) => i.outcome === "C2").length;
  const c3Count = items.filter((i) => i.outcome === "C3").length;
  const naCount = items.filter((i) => i.outcome === "na").length;
  const limCount = items.filter((i) => i.outcome === "lim").length;
  const unmarkedCount = items.filter((i) => !i.outcome).length;

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([category, categoryItems]) => (
        <InspectionGroup
          key={category}
          title={formatCategoryName(category)}
          rows={categoryItems.map((item) => ({
            id: `${item.category}-${item.itemCode}`,
            code: item.itemCode,
            label: item.description,
            value: item.outcome,
          }))}
          options={OUTCOME_PILLS}
          onChange={(id, val) => {
            const parts = id.split("-");
            const cat = parts[0];
            const code = parts.slice(1).join("-");
            handleOutcomeChange(code, cat, val);
          }}
          onMarkAllNA={() => handleMarkAllNA(category)}
          summary={getCategorySummary(categoryItems)}
        />
      ))}

      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-sm bg-[#1a1f2e] border border-white/10 px-5 py-3 mt-4">
        <span className="text-sm font-semibold text-[#e2e8f0]">Total: {totalItems}</span>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-400"><strong className="text-[#e2e8f0]">{passCount}</strong> Pass</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-xs text-gray-400"><strong className="text-[#e2e8f0]">{c1Count}</strong> C1</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-xs text-gray-400"><strong className="text-[#e2e8f0]">{c2Count}</strong> C2</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="text-xs text-gray-400"><strong className="text-[#e2e8f0]">{c3Count}</strong> C3</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
          <span className="text-xs text-gray-400"><strong className="text-[#e2e8f0]">{naCount}</strong> N/A</span>
        </div>
        {limCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-500" />
            <span className="text-xs text-gray-400"><strong className="text-[#e2e8f0]">{limCount}</strong> LIM</span>
          </div>
        )}
        {unmarkedCount > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full border border-white/20 bg-transparent" />
            <span className="text-xs text-gray-400"><strong className="text-[#e2e8f0]">{unmarkedCount}</strong> unmarked</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default InspectionChecklist;
