"use client";

import { cn } from "@/lib/cn";

type SkeletonProps = {
  className?: string;
  variant?: "text" | "circle" | "rectangle";
  width?: string | number;
  height?: string | number;
};

/**
 * Base Skeleton component with pulse animation.
 * Variants:
 * - text: For text placeholders (rounded-md, h-4)
 * - circle: For avatar/icon placeholders (rounded-full)
 * - rectangle: For card/image placeholders (rounded-xl)
 */
export function Skeleton({
  className,
  variant = "rectangle",
  width,
  height,
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-[var(--muted)]";

  const variants = {
    text: "h-4 rounded-md",
    circle: "rounded-full",
    rectangle: "rounded-xl",
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={cn(baseClasses, variants[variant], className)}
      style={style}
    />
  );
}

export default Skeleton;
