"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";

export type SavedView = {
  id: string;
  companyId: string;
  userId: string;
  name: string;
  entityType: string;
  filters: Record<string, unknown>;
  columns: unknown;
  sortBy: string | null;
  sortDir: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SavedViewSelectorProps = {
  entityType: string;
  currentView: SavedView | null;
  onSelect: (view: SavedView | null) => void;
  onSaveClick?: () => void;
  className?: string;
};

export function SavedViewSelector({
  entityType,
  currentView,
  onSelect,
  onSaveClick,
  className,
}: SavedViewSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [views, setViews] = React.useState<SavedView[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [viewToDelete, setViewToDelete] = React.useState<SavedView | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch views when dropdown opens
  React.useEffect(() => {
    if (!open) return;

    async function fetchViews() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/saved-views?entityType=${encodeURIComponent(entityType)}`);
        const data = await res.json();
        if (data.ok) {
          setViews(data.views || []);
        }
      } catch (e) {
        console.error("Failed to fetch saved views:", e);
      } finally {
        setLoading(false);
      }
    }

    fetchViews();
  }, [open, entityType]);

  function handleSelect(view: SavedView | null) {
    onSelect(view);
    setOpen(false);
  }

  function requestDelete(e: React.MouseEvent, view: SavedView) {
    e.stopPropagation();
    setViewToDelete(view);
  }

  async function handleDelete() {
    if (!viewToDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/saved-views/${viewToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        setViews((prev) => prev.filter((v) => v.id !== viewToDelete.id));
        if (currentView?.id === viewToDelete.id) {
          onSelect(null);
        }
      }
    } catch (e) {
      console.error("Failed to delete view:", e);
    } finally {
      setDeleting(false);
      setViewToDelete(null);
    }
  }

  return (
    <div ref={dropdownRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-9 px-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
      >
        <svg
          className="h-4 w-4 text-[var(--muted-foreground)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
        <span className="max-w-[120px] truncate">
          {currentView ? currentView.name : "All items"}
        </span>
        <svg
          className={cn(
            "h-4 w-4 text-[var(--muted-foreground)] transition-transform",
            open && "rotate-180"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-lg z-50">
          <div className="p-2">
            {/* Default "All items" option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                !currentView
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "hover:bg-[var(--muted)] text-[var(--foreground)]"
              )}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              All items
            </button>

            {/* Divider */}
            {views.length > 0 && (
              <div className="my-2 border-t border-[var(--border)]" />
            )}

            {/* Loading state */}
            {loading && (
              <div className="px-3 py-2 text-sm text-[var(--muted-foreground)]">
                Loading...
              </div>
            )}

            {/* Saved views */}
            {!loading && views.map((view) => (
              <div
                key={view.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                  currentView?.id === view.id
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "hover:bg-[var(--muted)] text-[var(--foreground)]"
                )}
                onClick={() => handleSelect(view)}
              >
                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
                <span className="flex-1 truncate text-sm">{view.name}</span>
                {view.isDefault && (
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded",
                    currentView?.id === view.id
                      ? "bg-[var(--primary-foreground)]/20"
                      : "bg-[var(--muted)]"
                  )}>
                    Default
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => requestDelete(e, view)}
                  className={cn(
                    "opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--destructive)] hover:text-[var(--destructive-foreground)] transition-all",
                    currentView?.id === view.id && "text-[var(--primary-foreground)]"
                  )}
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Save current view button */}
            {onSaveClick && (
              <>
                <div className="my-2 border-t border-[var(--border)]" />
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onSaveClick();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-[var(--primary)] hover:bg-[var(--muted)] transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Save current view...
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(viewToDelete)}
        title="Delete saved view?"
        message={viewToDelete ? `This will permanently delete the saved view "${viewToDelete.name}".` : ""}
        confirmLabel="Delete view"
        onCancel={() => setViewToDelete(null)}
        onConfirm={handleDelete}
        busy={deleting}
      />
    </div>
  );
}
