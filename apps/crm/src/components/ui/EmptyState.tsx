"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { AlertTriangle, Inbox, Plus } from "lucide-react";
import { Button } from "./button";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  icon?: "inbox" | "alert" | "none";
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  actionLabel,
  onAction,
  icon = "inbox",
  className
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-[#232A3B] bg-[#151922] px-8 py-12 text-center shadow-lg",
        className
      )}
    >
      {icon !== "none" && (
        <div className="w-16 h-16 rounded-full bg-[#1C2230] flex items-center justify-center text-[#A0A4AE]">
          {icon === "inbox" ? (
            <Inbox className="w-8 h-8" />
          ) : (
            <AlertTriangle className="w-8 h-8" />
          )}
        </div>
      )}
      <div>
        <div className="text-lg font-semibold text-[#E6E8EC]">{title}</div>
        {description && (
          <p className="mt-2 text-sm text-[#A0A4AE] max-w-md mx-auto">{description}</p>
        )}
      </div>
      {action ? (
        <div className="mt-2">{action}</div>
      ) : actionLabel && onAction ? (
        <Button variant="gradient" onClick={onAction} className="mt-2">
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
