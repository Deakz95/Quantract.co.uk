"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { AlertTriangle, Inbox, Plus, type LucideIcon } from "lucide-react";
import { Button } from "./button";

type PrimaryAction = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type SecondaryAction = {
  label: string;
  href: string;
};

type EmptyStateProps = {
  title: string;
  description?: string;
  features?: string[];
  primaryAction?: PrimaryAction;
  secondaryAction?: SecondaryAction;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon | "inbox" | "alert" | "none";
  className?: string;
};

export function EmptyState({
  title,
  description,
  features,
  primaryAction,
  secondaryAction,
  action,
  actionLabel,
  onAction,
  icon = "inbox",
  className
}: EmptyStateProps) {
  // Determine which icon to render
  const renderIcon = () => {
    if (icon === "none") return null;

    let IconComponent: LucideIcon;
    if (icon === "inbox") {
      IconComponent = Inbox;
    } else if (icon === "alert") {
      IconComponent = AlertTriangle;
    } else {
      IconComponent = icon;
    }

    return (
      <div className="w-16 h-16 rounded-full bg-[#1C2230] flex items-center justify-center text-[#A0A4AE]">
        <IconComponent className="w-8 h-8" />
      </div>
    );
  };

  // Render primary action button
  const renderPrimaryAction = () => {
    if (primaryAction) {
      const button = (
        <Button variant="gradient">
          <Plus className="w-4 h-4 mr-2" />
          {primaryAction.label}
        </Button>
      );

      if (primaryAction.href && !primaryAction.onClick) {
        return <Link href={primaryAction.href}>{button}</Link>;
      }

      return (
        <Button variant="gradient" onClick={primaryAction.onClick}>
          <Plus className="w-4 h-4 mr-2" />
          {primaryAction.label}
        </Button>
      );
    }

    // Legacy support for action prop
    if (action) {
      return <div className="mt-2">{action}</div>;
    }

    // Legacy support for actionLabel/onAction
    if (actionLabel && onAction) {
      return (
        <Button variant="gradient" onClick={onAction} className="mt-2">
          <Plus className="w-4 h-4 mr-2" />
          {actionLabel}
        </Button>
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border border-[#232A3B] bg-[#151922] px-8 py-12 text-center shadow-lg",
        className
      )}
    >
      {renderIcon()}

      <div className="max-w-md">
        <div className="text-lg font-semibold text-[#E6E8EC]">{title}</div>
        {description && (
          <p className="mt-2 text-sm text-[#A0A4AE]">{description}</p>
        )}

        {features && features.length > 0 && (
          <ul className="mt-4 text-left text-sm text-[#A0A4AE] space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-[var(--primary)] mt-1 flex-shrink-0">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
        {renderPrimaryAction()}

        {secondaryAction && (
          <Link
            href={secondaryAction.href}
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-dark)] hover:underline transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            {secondaryAction.label}
          </Link>
        )}
      </div>
    </div>
  );
}
