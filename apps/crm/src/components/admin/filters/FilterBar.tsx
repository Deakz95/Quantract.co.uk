"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type FilterValue = string | string[] | { from?: string; to?: string } | null;

export type Filters = Record<string, FilterValue>;

type FilterConfig = {
  key: string;
  label: string;
  type: "select" | "multiselect" | "daterange" | "text";
  options?: { value: string; label: string }[];
  placeholder?: string;
};

const defaultFilterConfigs: Record<string, FilterConfig[]> = {
  contacts: [
    {
      key: "isPrimary",
      label: "Type",
      type: "select",
      options: [
        { value: "", label: "All" },
        { value: "true", label: "Primary" },
        { value: "false", label: "Secondary" },
      ],
    },
  ],
  clients: [
    {
      key: "hasJobs",
      label: "Has Jobs",
      type: "select",
      options: [
        { value: "", label: "All" },
        { value: "true", label: "Yes" },
        { value: "false", label: "No" },
      ],
    },
  ],
  deals: [
    {
      key: "stageId",
      label: "Stage",
      type: "select",
      options: [{ value: "", label: "All Stages" }],
    },
    {
      key: "dateRange",
      label: "Expected Close",
      type: "daterange",
    },
  ],
  jobs: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "", label: "All" },
        { value: "draft", label: "Draft" },
        { value: "scheduled", label: "Scheduled" },
        { value: "in_progress", label: "In Progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
      ],
    },
    {
      key: "dateRange",
      label: "Scheduled Date",
      type: "daterange",
    },
  ],
};

export type FilterBarProps = {
  entityType: string;
  filters: Filters;
  onChange: (filters: Filters) => void;
  filterConfigs?: FilterConfig[];
  className?: string;
};

export function FilterBar({
  entityType,
  filters,
  onChange,
  filterConfigs,
  className,
}: FilterBarProps) {
  const configs = filterConfigs || defaultFilterConfigs[entityType] || [];

  function handleFilterChange(key: string, value: FilterValue) {
    const newFilters = { ...filters };
    if (value === "" || value === null || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onChange(newFilters);
  }

  function handleDateRangeChange(key: string, field: "from" | "to", value: string) {
    const current = (filters[key] as { from?: string; to?: string }) || {};
    const newValue = { ...current, [field]: value || undefined };
    if (!newValue.from && !newValue.to) {
      handleFilterChange(key, null);
    } else {
      handleFilterChange(key, newValue);
    }
  }

  function clearFilters() {
    onChange({});
  }

  const hasActiveFilters = Object.keys(filters).length > 0;

  if (configs.length === 0) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {configs.map((config) => {
        if (config.type === "select") {
          return (
            <div key={config.key} className="flex items-center gap-2">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                {config.label}
              </label>
              <select
                value={(filters[config.key] as string) || ""}
                onChange={(e) => handleFilterChange(config.key, e.target.value)}
                className="h-9 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                {config.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        if (config.type === "daterange") {
          const dateValue = (filters[config.key] as { from?: string; to?: string }) || {};
          return (
            <div key={config.key} className="flex items-center gap-2">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                {config.label}
              </label>
              <input
                type="date"
                value={dateValue.from || ""}
                onChange={(e) => handleDateRangeChange(config.key, "from", e.target.value)}
                className="h-9 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="From"
              />
              <span className="text-[var(--muted-foreground)]">-</span>
              <input
                type="date"
                value={dateValue.to || ""}
                onChange={(e) => handleDateRangeChange(config.key, "to", e.target.value)}
                className="h-9 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                placeholder="To"
              />
            </div>
          );
        }

        if (config.type === "text") {
          return (
            <div key={config.key} className="flex items-center gap-2">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">
                {config.label}
              </label>
              <input
                type="text"
                value={(filters[config.key] as string) || ""}
                onChange={(e) => handleFilterChange(config.key, e.target.value)}
                placeholder={config.placeholder}
                className="h-9 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          );
        }

        return null;
      })}

      {hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <svg
            className="h-4 w-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Clear filters
        </Button>
      )}
    </div>
  );
}
