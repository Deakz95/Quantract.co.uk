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
  return (
    <div className="rounded-xl overflow-hidden">
      {/* Sticky group header */}
      <div className="sticky top-0 z-10 bg-[#232a3b] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[#e2e8f0]">{title}</span>
          <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
            {rows.length} items
          </span>
          {summary && (
            <span className="text-xs text-gray-500 hidden sm:inline">&mdash; {summary}</span>
          )}
        </div>
        {onMarkAllNA && (
          <button
            type="button"
            onClick={onMarkAllNA}
            className="text-xs text-gray-400 hover:text-gray-200 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg transition-colors"
          >
            Mark All N/A
          </button>
        )}
      </div>

      {/* Inspection rows */}
      <div>
        {rows.map((row, idx) => (
          <div
            key={row.id}
            className={`flex items-center gap-3 px-4 py-2 ${
              idx % 2 === 0 ? "bg-white/[0.02]" : ""
            }`}
          >
            <span className="font-mono text-xs font-bold text-blue-400 w-10 shrink-0">
              {row.code}
            </span>
            <span className="text-sm text-[#e2e8f0] flex-1 min-w-0">{row.label}</span>
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
