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
    <div className="flex items-center gap-2.5 mb-5">
      <div className="bg-[var(--primary)] text-white w-[26px] h-[26px] rounded-sm text-xs font-bold flex items-center justify-center shrink-0">
        {number}
      </div>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      {fieldCount != null && fieldCount > 0 && (
        <span className="ml-auto text-xs text-[var(--muted-foreground)]">
          {fieldCount} field{fieldCount !== 1 ? "s" : ""}
        </span>
      )}
      {children && <div className="ml-auto">{children}</div>}
    </div>
  );
}
