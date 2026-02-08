"use client";

import type { ReactNode } from "react";

interface SectionHeadingProps {
  number: number;
  title: string;
  fieldCount?: number;
  children?: ReactNode;
}

export function SectionHeading({ number, title, fieldCount, children }: SectionHeadingProps) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="bg-blue-600 text-white w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center shrink-0">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-[#e2e8f0]">{title}</h3>
      {fieldCount != null && fieldCount > 0 && (
        <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
          {fieldCount} field{fieldCount !== 1 ? "s" : ""}
        </span>
      )}
      {children && <div className="ml-auto">{children}</div>}
    </div>
  );
}
