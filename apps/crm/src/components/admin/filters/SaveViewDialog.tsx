"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import type { Filters } from "./FilterBar";

export type SaveViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  filters: Filters;
  sortBy?: string | null;
  sortDir?: string | null;
  columns?: unknown;
  onSaved?: (view: {
    id: string;
    name: string;
    entityType: string;
    filters: Filters;
    isDefault: boolean;
  }) => void;
};

export function SaveViewDialog({
  open,
  onOpenChange,
  entityType,
  filters,
  sortBy,
  sortDir,
  columns,
  onSaved,
}: SaveViewDialogProps) {
  const [name, setName] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      setName("");
      setIsDefault(false);
      setError(null);
    }
  }, [open]);

  async function handleSave() {
    if (!name.trim()) {
      setError("Please enter a name for this view");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          entityType,
          filters,
          columns,
          sortBy,
          sortDir,
          isDefault,
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Failed to save view");
        return;
      }

      onSaved?.({
        id: data.view.id,
        name: data.view.name,
        entityType: data.view.entityType,
        filters: data.view.filters,
        isDefault: data.view.isDefault,
      });

      onOpenChange(false);
    } catch (e) {
      console.error("Failed to save view:", e);
      setError("Failed to save view. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const filterCount = Object.keys(filters).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save View</DialogTitle>
          <DialogDescription>
            Save your current filters as a view for quick access later.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* View name input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">
                View name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., High-value deals, Active clients..."
                autoFocus
              />
            </div>

            {/* Filter summary */}
            <div className="rounded-xl bg-[var(--muted)] p-3">
              <div className="text-xs font-medium text-[var(--muted-foreground)] mb-2">
                This view will include:
              </div>
              <div className="text-sm text-[var(--foreground)]">
                {filterCount === 0 ? (
                  <span className="text-[var(--muted-foreground)]">No filters applied</span>
                ) : (
                  <span>{filterCount} filter{filterCount !== 1 ? "s" : ""} applied</span>
                )}
              </div>
              {sortBy && (
                <div className="text-sm text-[var(--foreground)] mt-1">
                  Sorted by: {sortBy} ({sortDir || "asc"})
                </div>
              )}
            </div>

            {/* Set as default checkbox */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
              />
              <div>
                <div className="text-sm font-medium text-[var(--foreground)]">
                  Set as default view
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  This view will be applied automatically when you open this page
                </div>
              </div>
            </label>

            {/* Error message */}
            {error && (
              <div className="rounded-xl bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 p-3 text-sm text-[var(--destructive)]">
                {error}
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving..." : "Save view"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
