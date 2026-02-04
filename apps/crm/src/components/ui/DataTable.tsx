"use client";

import { ReactNode, useMemo } from "react";
import { cn } from "@/lib/cn";
import { Checkbox } from "./checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./DropdownMenu";
import { ChevronUp, ChevronDown, Ellipsis } from "lucide-react";

// Utility function for relative time formatting
function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return "-";

  const now = new Date();
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
  return `${diffYears} year${diffYears === 1 ? "" : "s"} ago`;
}

export { formatRelativeTime };

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

export type Action<T> = {
  label: string;
  onClick: (row: T) => void;
  variant?: "default" | "danger";
  icon?: ReactNode;
};

export type SortDirection = "asc" | "desc";

export type DataTableProps<T extends { id: string }> = {
  columns: Column<T>[];
  data: T[];
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string, direction: SortDirection) => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  actions?: Action<T>[];
  getRowId?: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  loading?: boolean;
};

export function DataTable<T extends { id: string }>({
  columns,
  data,
  sortKey,
  sortDirection,
  onSort,
  selectedIds = [],
  onSelectionChange,
  actions,
  getRowId = (row) => row.id,
  onRowClick,
  emptyMessage = "No data available",
  className,
  loading,
}: DataTableProps<T>) {
  const hasSelection = Boolean(onSelectionChange);
  const hasActions = actions && actions.length > 0;

  const allIds = useMemo(() => data.map(getRowId), [data, getRowId]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allIds);
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((sid) => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleSort = (key: string) => {
    if (!onSort) return;
    const newDirection: SortDirection =
      sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    onSort(key, newDirection);
  };

  const renderSortIndicator = (key: string) => {
    if (sortKey !== key) {
      return (
        <span className="ml-1 opacity-0 group-hover:opacity-40 transition-opacity">
          <ChevronUp className="w-3 h-3" />
        </span>
      );
    }
    return (
      <span className="ml-1">
        {sortDirection === "asc" ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[var(--muted-foreground)]">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Loading...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-[var(--muted-foreground)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            {hasSelection && (
              <th className="w-12 p-4 text-left">
                <Checkbox
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = someSelected;
                    }
                  }}
                  onChange={handleSelectAll}
                  aria-label="Select all"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "p-4 text-left text-sm font-semibold text-[var(--foreground)]",
                  column.sortable && "cursor-pointer select-none group",
                  column.headerClassName
                )}
                onClick={column.sortable ? () => handleSort(column.key) : undefined}
              >
                <div className="flex items-center">
                  {column.label}
                  {column.sortable && renderSortIndicator(column.key)}
                </div>
              </th>
            ))}
            {hasActions && (
              <th className="w-12 p-4 text-right">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const rowId = getRowId(row);
            const isSelected = selectedIds.includes(rowId);

            return (
              <tr
                key={rowId}
                className={cn(
                  "border-b border-[var(--border)] transition-colors",
                  "hover:bg-[var(--muted)]/50",
                  isSelected && "bg-[var(--primary)]/5",
                  onRowClick && "cursor-pointer",
                  index % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]/30"
                )}
                onClick={(e) => {
                  // Don't trigger row click if clicking on checkbox or actions
                  const target = e.target as HTMLElement;
                  if (target.closest('[data-no-row-click]')) return;
                  onRowClick?.(row);
                }}
              >
                {hasSelection && (
                  <td className="p-4" data-no-row-click>
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleSelectRow(rowId)}
                      aria-label={`Select row ${rowId}`}
                    />
                  </td>
                )}
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("p-4 text-[var(--foreground)]", column.className)}
                  >
                    {column.render
                      ? column.render(row)
                      : String((row as Record<string, unknown>)[column.key] ?? "-")}
                  </td>
                ))}
                {hasActions && (
                  <td className="p-4 text-right" data-no-row-click>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-[var(--muted)] transition-colors"
                          aria-label="Row actions"
                        >
                          <Ellipsis className="w-4 h-4 text-[var(--muted-foreground)]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action, actionIndex) => (
                          <div key={action.label}>
                            {action.variant === "danger" && actionIndex > 0 && (
                              <DropdownMenuSeparator />
                            )}
                            <DropdownMenuItem
                              onClick={() => action.onClick(row)}
                              className={cn(
                                action.variant === "danger" && "text-[var(--error)] hover:bg-[var(--error)]/10"
                              )}
                            >
                              {action.icon && <span className="mr-2">{action.icon}</span>}
                              {action.label}
                            </DropdownMenuItem>
                          </div>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Bulk action bar component
export type BulkAction = {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
};

export type BulkActionBarProps = {
  selectedCount: number;
  onDelete?: () => void;
  onClearSelection: () => void;
  deleteLabel?: string;
  className?: string;
  actions?: BulkAction[];
};

export function BulkActionBar({
  selectedCount,
  onDelete,
  onClearSelection,
  deleteLabel = "Delete selected",
  className,
  actions,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]",
        className
      )}
    >
      <span className="text-sm font-medium text-[var(--foreground)]">
        {selectedCount} item{selectedCount === 1 ? "" : "s"} selected
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onClearSelection}
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          Clear selection
        </button>
        {actions?.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={cn(
              "px-3 py-1.5 text-sm rounded-lg transition-colors",
              action.variant === "danger"
                ? "bg-[var(--error)] text-white hover:bg-[var(--error)]/90"
                : "bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
            )}
          >
            {action.label}
          </button>
        ))}
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--error)] text-white hover:bg-[var(--error)]/90 transition-colors"
          >
            {deleteLabel}
          </button>
        )}
      </div>
    </div>
  );
}
