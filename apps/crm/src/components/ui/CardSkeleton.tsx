"use client";

import { cn } from "@/lib/cn";
import { Skeleton } from "./Skeleton";

type CardSkeletonProps = {
  className?: string;
};

/**
 * CardSkeleton for grid layout loading states (e.g., Jobs page).
 * Matches the Card styling used throughout the app.
 */
export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5",
        className
      )}
    >
      <div className="flex justify-between items-start mb-3">
        {/* Icon placeholder */}
        <Skeleton variant="rectangle" className="w-10 h-10 rounded-xl" />
        {/* Badge placeholder */}
        <Skeleton variant="text" className="h-5 w-16 rounded-full" />
      </div>
      {/* Title */}
      <Skeleton variant="text" className="h-5 w-3/4 mb-2" />
      {/* Subtitle line 1 */}
      <Skeleton variant="text" className="h-4 w-2/3 mb-2" />
      {/* Subtitle line 2 */}
      <Skeleton variant="text" className="h-4 w-1/2 mb-3" />
      {/* Footer section */}
      <div className="pt-3 border-t border-[var(--border)]">
        <Skeleton variant="text" className="h-3 w-1/3" />
      </div>
    </div>
  );
}

/**
 * CardGridSkeleton renders multiple CardSkeleton components in a grid.
 */
export function CardGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * KanbanColumnSkeleton for the Deals Kanban board loading state.
 */
export function KanbanColumnSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex-shrink-0 w-[320px] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)]",
        className
      )}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" className="w-3 h-3" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton variant="text" className="h-4 w-24" />
              <Skeleton variant="text" className="h-4 w-6 rounded-full" />
            </div>
            <Skeleton variant="text" className="h-3 w-16" />
          </div>
        </div>
      </div>
      {/* Column Body */}
      <div className="flex-1 p-3 space-y-3 min-h-[200px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <KanbanCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * KanbanCardSkeleton for individual deal card placeholders.
 */
export function KanbanCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--background)] p-3",
        className
      )}
    >
      {/* Title and value */}
      <Skeleton variant="text" className="h-4 w-3/4 mb-2" />
      <Skeleton variant="text" className="h-5 w-20 mb-3" />
      {/* Contact/Client info */}
      <div className="flex items-center gap-2">
        <Skeleton variant="circle" className="w-5 h-5" />
        <Skeleton variant="text" className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * KanbanBoardSkeleton renders the full Kanban board loading state.
 */
export function KanbanBoardSkeleton({
  columns = 4,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-4 overflow-x-auto pb-4", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <KanbanColumnSkeleton key={i} />
      ))}
    </div>
  );
}

export default CardSkeleton;
