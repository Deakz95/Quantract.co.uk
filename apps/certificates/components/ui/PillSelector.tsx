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
  C1: "bg-red-600 text-white",
  C2: "bg-amber-600 text-white",
  C3: "bg-yellow-600 text-white",
  FI: "bg-blue-600 text-white",
  pass: "bg-emerald-600 text-white",
  Pass: "bg-emerald-600 text-white",
  Fail: "bg-red-600 text-white",
  fail: "bg-red-600 text-white",
  na: "bg-gray-600 text-white",
  "N/A": "bg-gray-600 text-white",
  lim: "bg-gray-600 text-white",
  LIM: "bg-gray-600 text-white",
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
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              isSelected
                ? selectedColor
                : "bg-white/5 text-gray-400 hover:bg-white/10"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
