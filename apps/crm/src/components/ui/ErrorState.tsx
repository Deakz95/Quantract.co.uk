"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

type ErrorStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  onRetry?: () => void;
  meta?: string;
  className?: string;
};

export function ErrorState({
  title = "Something went wrong",
  description = "Please try again.",
  action,
  onRetry,
  meta,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-[#EF4444]/20 bg-[#151922] px-8 py-12 text-center shadow-lg",
        className
      )}
    >
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1C2230] text-[#EF4444]">
        <AlertCircle className="h-8 w-8" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-[#FFFFFF]">{title}</h3>

      {/* Description */}
      {description && (
        <p className="max-w-md text-sm text-[#A0A4AE]">{description}</p>
      )}

      {/* Meta information */}
      {meta && (
        <p className="text-xs text-[#A0A4AE]/60 font-mono">{meta}</p>
      )}

      {/* Actions */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button variant="default" type="button" onClick={onRetry} className="inline-flex h-11 items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        ) : null}
        {action}
      </div>
    </div>
  );
}
