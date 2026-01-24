import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
      <table className={cn("w-full text-sm", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-[var(--border)] bg-[var(--muted)]", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-[var(--border)]", className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "text-left transition-colors hover:bg-[var(--muted)]/50",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("px-4 py-3 text-sm text-[var(--foreground)]", className)}
      {...props}
    />
  );
}
