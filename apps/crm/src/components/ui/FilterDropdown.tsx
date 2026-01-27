"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/cn";
import { Filter, X, ChevronDown, Search } from "lucide-react";

export type FilterValue = string | string[] | { from?: string; to?: string } | null;

export type Filters = Record<string, FilterValue>;

export type FilterOption = {
  value: string;
  label: string;
};

export type FilterConfig = {
  key: string;
  label: string;
  type: "select" | "multiselect" | "search" | "daterange";
  options?: FilterOption[];
  placeholder?: string;
};

export type FilterDropdownProps = {
  filters: Filters;
  onApply: (filters: Filters) => void;
  filterConfigs: FilterConfig[];
  className?: string;
};

export function FilterDropdown({
  filters,
  onApply,
  filterConfigs,
  className,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<Filters>(filters);
  const [searchInputs, setSearchInputs] = useState<Record<string, string>>({});
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync local filters when external filters change
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  // Count active filters
  const activeFilterCount = Object.keys(filters).filter((key) => {
    const value = filters[key];
    if (value === null || value === undefined || value === "") return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === "object" && !Array.isArray(value)) {
      return value.from || value.to;
    }
    return true;
  }).length;

  function handleFilterChange(key: string, value: FilterValue) {
    setLocalFilters((prev) => {
      const newFilters = { ...prev };
      if (value === "" || value === null || (Array.isArray(value) && value.length === 0)) {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
  }

  function handleMultiselectToggle(key: string, optionValue: string) {
    setLocalFilters((prev) => {
      const currentValues = (prev[key] as string[]) || [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];

      const newFilters = { ...prev };
      if (newValues.length === 0) {
        delete newFilters[key];
      } else {
        newFilters[key] = newValues;
      }
      return newFilters;
    });
  }

  function handleDateRangeChange(key: string, field: "from" | "to", value: string) {
    setLocalFilters((prev) => {
      const current = (prev[key] as { from?: string; to?: string }) || {};
      const newValue = { ...current, [field]: value || undefined };

      const newFilters = { ...prev };
      if (!newValue.from && !newValue.to) {
        delete newFilters[key];
      } else {
        newFilters[key] = newValue;
      }
      return newFilters;
    });
  }

  function handleApply() {
    onApply(localFilters);
    setIsOpen(false);
  }

  function handleClear() {
    setLocalFilters({});
    setSearchInputs({});
    onApply({});
    setIsOpen(false);
  }

  function getFilteredOptions(config: FilterConfig): FilterOption[] {
    const searchTerm = searchInputs[config.key]?.toLowerCase() || "";
    if (!searchTerm) return config.options || [];
    return (config.options || []).filter((opt) =>
      opt.label.toLowerCase().includes(searchTerm)
    );
  }

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Filter${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
      >
        <Filter className="w-4 h-4" aria-hidden="true" />
        Filter
        {activeFilterCount > 0 && (
          <Badge variant="default" className="ml-1 px-1.5 py-0.5 text-xs min-w-[20px] h-5">
            {activeFilterCount}
          </Badge>
        )}
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
      </Button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 min-w-[320px] rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
              <span className="font-semibold text-[var(--foreground)]">Filters</span>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClear}
                  className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {filterConfigs.map((config) => (
              <div key={config.key} className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  {config.label}
                </label>

                {/* Single Select */}
                {config.type === "select" && (
                  <select
                    value={(localFilters[config.key] as string) || ""}
                    onChange={(e) => handleFilterChange(config.key, e.target.value)}
                    className="w-full h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                  >
                    <option value="">All</option>
                    {config.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {/* Multi-Select with checkboxes */}
                {config.type === "multiselect" && (
                  <div className="space-y-2" role="group" aria-label={config.label}>
                    <div className="max-h-40 overflow-y-auto space-y-1 border border-[var(--border)] rounded-lg p-2 bg-[var(--background)]">
                      {config.options?.map((opt) => {
                        const isChecked = ((localFilters[config.key] as string[]) || []).includes(opt.value);
                        return (
                          <div
                            key={opt.value}
                            className="flex items-center gap-2 py-1 px-1 rounded hover:bg-[var(--muted)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset"
                            onClick={() => handleMultiselectToggle(config.key, opt.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleMultiselectToggle(config.key, opt.value);
                              }
                            }}
                            tabIndex={0}
                            role="checkbox"
                            aria-checked={isChecked}
                          >
                            <Checkbox
                              checked={isChecked}
                              onChange={() => {}}
                              className="pointer-events-none"
                              aria-hidden="true"
                            />
                            <span className="text-sm text-[var(--foreground)]">{opt.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search/Select with search input */}
                {config.type === "search" && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                      <input
                        type="text"
                        placeholder={config.placeholder || "Search..."}
                        value={searchInputs[config.key] || ""}
                        onChange={(e) => setSearchInputs((prev) => ({ ...prev, [config.key]: e.target.value }))}
                        className="w-full h-9 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1 border border-[var(--border)] rounded-lg p-2 bg-[var(--background)]">
                      {getFilteredOptions(config).length === 0 ? (
                        <div className="text-sm text-[var(--muted-foreground)] text-center py-2">
                          No results found
                        </div>
                      ) : (
                        getFilteredOptions(config).map((opt) => {
                          const isSelected = localFilters[config.key] === opt.value;
                          return (
                            <div
                              key={opt.value}
                              className={cn(
                                "flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-inset",
                                isSelected
                                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                                  : "hover:bg-[var(--muted)] text-[var(--foreground)]"
                              )}
                              onClick={() => handleFilterChange(config.key, isSelected ? "" : opt.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleFilterChange(config.key, isSelected ? "" : opt.value);
                                }
                              }}
                              tabIndex={0}
                              role="option"
                              aria-selected={isSelected}
                            >
                              {opt.label}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Date Range */}
                {config.type === "daterange" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={((localFilters[config.key] as { from?: string; to?: string }) || {}).from || ""}
                      onChange={(e) => handleDateRangeChange(config.key, "from", e.target.value)}
                      className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      placeholder="From"
                    />
                    <span className="text-[var(--muted-foreground)]">to</span>
                    <input
                      type="date"
                      value={((localFilters[config.key] as { from?: string; to?: string }) || {}).to || ""}
                      onChange={(e) => handleDateRangeChange(config.key, "to", e.target.value)}
                      className="flex-1 h-9 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      placeholder="To"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border)] bg-[var(--muted)]/30">
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button variant="default" size="sm" onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
