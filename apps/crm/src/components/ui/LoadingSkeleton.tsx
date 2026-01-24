"use client";

import { cn } from "@/lib/cn";

type LoadingSkeletonProps = {
  className?: string;
  variant?: "line" | "card" | "avatar" | "button";
};

export function LoadingSkeleton({ className, variant = "line" }: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-gradient-to-r from-[var(--muted)] via-[var(--border)] to-[var(--muted)] bg-[length:200%_100%]";
  
  const variants = {
    line: "h-4 w-full rounded-lg",
    card: "h-32 w-full rounded-2xl",
    avatar: "h-10 w-10 rounded-full",
    button: "h-10 w-24 rounded-xl",
  };

  return (
    <div
      className={cn(baseClasses, variants[variant], className)}
      style={{
        animation: "shimmer 2s linear infinite",
      }}
    />
  );
}

export function LoadingCard() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
      <div className="flex items-center gap-4">
        <LoadingSkeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton className="h-4 w-32" />
          <LoadingSkeleton className="h-3 w-24" />
        </div>
      </div>
      <LoadingSkeleton className="h-4 w-full" />
      <LoadingSkeleton className="h-4 w-3/4" />
      <div className="flex gap-2 pt-2">
        <LoadingSkeleton variant="button" />
        <LoadingSkeleton variant="button" />
      </div>
    </div>
  );
}

export function LoadingTable() {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)]">
        <LoadingSkeleton className="h-4 w-48" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-4 border-b border-[var(--border)] last:border-0 flex items-center gap-4">
          <LoadingSkeleton variant="avatar" className="w-8 h-8" />
          <LoadingSkeleton className="h-4 flex-1" />
          <LoadingSkeleton className="h-4 w-24" />
          <LoadingSkeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
