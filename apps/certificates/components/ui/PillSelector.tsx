"use client";

export interface PillOption {
  label: string;
  value: string;
  color?: string;
}

interface PillSelectorProps {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const DEFAULT_COLORS: Record<string, string> = {
  C1: "bg-red-500/20 text-red-400 border-red-500/30",
  C2: "bg-red-500/20 text-red-400 border-red-500/30",
  C3: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  FI: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Pass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Fail: "bg-red-500/20 text-red-400 border-red-500/30",
  fail: "bg-red-500/20 text-red-400 border-red-500/30",
  na: "bg-white/8 text-gray-300 border-white/10",
  "N/A": "bg-white/8 text-gray-300 border-white/10",
  lim: "bg-white/8 text-gray-300 border-white/10",
  LIM: "bg-white/8 text-gray-300 border-white/10",
  "N/V": "bg-white/8 text-gray-300 border-white/10",
};

export function PillSelector({ options, value, onChange, className = "" }: PillSelectorProps) {
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {options.map((opt) => {
        const isSelected = value === opt.value;
        const selectedColor = opt.color || DEFAULT_COLORS[opt.value] || "bg-blue-600 text-white";
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(isSelected ? "" : opt.value)}
            className={`px-2.5 py-1 rounded-sm text-[10px] font-semibold border transition-all ${
              isSelected
                ? selectedColor
                : "bg-white/[0.03] text-gray-400 border-white/10 hover:bg-white/[0.08]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
