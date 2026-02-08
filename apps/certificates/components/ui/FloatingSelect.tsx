"use client";

import { useId } from "react";

interface FloatingSelectProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function FloatingSelect({
  label,
  value,
  onChange,
  children,
  id: externalId,
  className = "",
  disabled,
}: FloatingSelectProps) {
  const autoId = useId();
  const id = externalId || autoId;
  const hasValue = value != null && value !== "";

  return (
    <div className={`relative ${className}`}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="peer w-full bg-[#0f1115] border border-white/10 rounded-sm px-3 pt-5 pb-1.5 text-sm text-[#e2e8f0] appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {children}
      </select>
      <label
        htmlFor={id}
        className={`absolute left-3 z-[2] transition-all duration-150 pointer-events-none font-semibold uppercase tracking-wider ${
          hasValue
            ? "top-1 text-[9px] text-cyan-400"
            : "top-1 text-[9px] text-cyan-400"
        }`}
      >
        {label}
      </label>
      {/* Chevron */}
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
