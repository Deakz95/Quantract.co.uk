import type { ReactNode } from "react";
import { Badge } from "./badge";

export function PageHeader({
  title,
  subtitle,
  badge,
  right,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
          {badge && <Badge variant="gradient">{badge}</Badge>}
        </div>
        {subtitle && (
          <p className="mt-1.5 text-[var(--muted-foreground)]">{subtitle}</p>
        )}
      </div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </div>
  );
}
