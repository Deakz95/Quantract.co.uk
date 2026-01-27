"use client";

import { cn } from "@/lib/cn";
import { Skeleton } from "./Skeleton";

type TableSkeletonProps = {
  columns: number;
  rows?: number;
  className?: string;
  showHeader?: boolean;
};

/**
 * TableSkeleton component for loading states in table views.
 * Renders skeleton header and body rows matching the app's table styling.
 */
export function TableSkeleton({
  columns,
  rows = 5,
  className,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]", className)}>
      <table className="w-full text-sm">
        {showHeader && (
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--muted)]">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton variant="text" className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-[var(--border)]">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-[var(--muted)]/50">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <Skeleton
                    variant="text"
                    className={cn(
                      "h-4",
                      colIndex === 0 ? "w-32" : colIndex === columns - 1 ? "w-20" : "w-24"
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Inline table skeleton for use inside existing Card components.
 * Does not include the outer container styling.
 */
export function TableSkeletonInline({
  columns,
  rows = 5,
  className,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">
        {showHeader && (
          <thead>
            <tr className="border-b border-[var(--border)]">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="text-left p-4">
                  <Skeleton variant="text" className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className={cn(
              "border-b border-[var(--border)]",
              rowIndex % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]/50"
            )}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="p-4">
                  <Skeleton
                    variant="text"
                    className={cn(
                      "h-4",
                      colIndex === 0 ? "w-32" : colIndex === columns - 1 ? "w-20" : "w-24"
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableSkeleton;
