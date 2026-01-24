import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type FeatureGateProps = {
  enabled: boolean;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  children: ReactNode;
};

export function FeatureGate({
  enabled,
  title,
  description,
  ctaLabel = "Upgrade plan",
  ctaHref = "/admin/billing",
  children,
}: FeatureGateProps) {
  if (enabled) return <>{children}</>;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="font-semibold">{title}</div>
        <div className="mt-1">{description}</div>
        <div className="mt-3">
          <Link href={ctaHref}>
            <Button type="button">{ctaLabel}</Button>
          </Link>
        </div>
      </div>
      <div className={cn("space-y-6", "pointer-events-none opacity-60")}>{children}</div>
    </div>
  );
}
