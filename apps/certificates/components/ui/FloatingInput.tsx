"use client";

import { useId } from "react";

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  placeholder?: string;
  unit?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function FloatingInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  unit,
  id: externalId,
  className = "",
  disabled,
}: FloatingInputProps) {
  const autoId = useId();
  const id = externalId || autoId;
  const hasValue = value != null && value !== "";

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder ?? " "}
        disabled={disabled}
        className={`peer w-full bg-[#0f1115] border border-white/10 rounded-lg px-3 pt-5 pb-1.5 text-sm text-[#e2e8f0] placeholder-transparent focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 transition-colors disabled:opacity-50 ${unit ? "pr-10" : ""}`}
      />
      <label
        htmlFor={id}
        className={`absolute left-3 transition-all duration-150 pointer-events-none ${
          hasValue
            ? "top-1 text-[10px] text-cyan-400"
            : "top-3.5 text-sm text-gray-400 peer-focus:top-1 peer-focus:text-[10px] peer-focus:text-cyan-400"
        }`}
      >
        {label}
      </label>
      {unit && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  );
}
