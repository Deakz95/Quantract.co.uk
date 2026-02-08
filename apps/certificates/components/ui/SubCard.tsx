"use client";

import type { ReactNode } from "react";

interface SubCardProps {
  title?: string;
  accentColor?: string;
  children: ReactNode;
  className?: string;
}

export function SubCard({ title, accentColor = "#3b82f6", children, className = "" }: SubCardProps) {
  return (
    <div
      className={`bg-[#1a1f2e] rounded-sm border-l-2 p-4 ${className}`}
      style={{ borderLeftColor: accentColor }}
    >
      {title && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
