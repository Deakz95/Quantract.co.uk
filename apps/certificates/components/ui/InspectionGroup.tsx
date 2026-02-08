"use client";

import { PillSelector, type PillOption } from "./PillSelector";

export interface InspectionRow {
  id: string;
  code: string;
  label: string;
  value: string;
}

interface InspectionGroupProps {
  title: string;
  rows: InspectionRow[];
  options: PillOption[];
  onChange: (id: string, value: string) => void;
  onMarkAllNA?: () => void;
  summary?: string;
}

export function InspectionGroup({
  title,
  rows,
  options,
  onChange,
  onMarkAllNA,
  summary,
}: InspectionGroupProps) {
  const markedCount = rows.filter((r) => r.value).length;

  return (
    <div className="rounded overflow-hidden">
      {/* Sticky group header */}
      <div className="sticky top-0 z-10 bg-[#232a3b] px-4 py-2.5 flex items-center justify-between border-b border-white/[0.03]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-cyan-400">{title}</span>
          {summary && (
            <span className="text-xs text-gray-500 hidden sm:inline">&mdash; {summary}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {rows.length} Items{markedCount > 0 ? ` \u00B7 ${markedCount} Marked` : ""}
          </span>
          {onMarkAllNA && (
            <button
              type="button"
              onClick={onMarkAllNA}
              className="text-xs text-gray-400 hover:text-gray-200 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-sm transition-colors"
            >
              Mark All N/A
            </button>
          )}
        </div>
      </div>

      {/* Inspection rows */}
      <div>
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className={`flex items-center gap-3 px-4 py-2 border-b border-white/[0.03] ${
              idx % 2 === 1 ? "bg-white/[0.016]" : ""
            }`}
          >
            <span className="font-mono text-xs font-bold text-cyan-400 w-9 shrink-0">
              {row.code}
            </span>
            <span className="text-[13px] text-[#e2e8f0] flex-1 min-w-0">{row.label}</span>
            <PillSelector
              options={options}
              value={row.value}
              onChange={(val) => onChange(row.id, val)}
              className="shrink-0"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
