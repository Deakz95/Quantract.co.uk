import type { HTMLAttributes, KeyboardEvent } from "react";
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

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Makes the row focusable and clickable with keyboard */
  isClickable?: boolean;
}

export function TableRow({ className, isClickable, onClick, onKeyDown, ...props }: TableRowProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (isClickable && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick?.(e as unknown as React.MouseEvent<HTMLTableRowElement>);
    }
    onKeyDown?.(e);
  };

  return (
    <tr
      className={cn(
        "text-left transition-colors hover:bg-[var(--muted)]/50",
        isClickable && "cursor-pointer focus-visible:outline-none focus-visible:bg-[var(--primary)]/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]",
        className
      )}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
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
