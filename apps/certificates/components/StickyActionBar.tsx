"use client";

import { Button } from "@quantract/ui";

interface StickyActionBarProps {
  onSave: () => void;
  onDownload: () => void;
  isSaving: boolean;
  isGenerating: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  downloadLabel?: string;
}

export function StickyActionBar({
  onSave,
  onDownload,
  isSaving,
  isGenerating,
  saveStatus,
  downloadLabel = "Download PDF",
}: StickyActionBarProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 bg-[var(--card)] border-t border-[var(--border)] px-4 safe-area-bottom"
      style={{ paddingTop: 12, paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="max-w-5xl mx-auto flex items-center justify-end gap-3">
        <Button
          variant="secondary"
          onClick={onSave}
          disabled={isSaving}
          className="min-h-[48px] min-w-[100px] px-6 text-base"
        >
          {saveStatus === "saving" ? (
            "Saving..."
          ) : saveStatus === "saved" ? (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          ) : (
            "Save"
          )}
        </Button>
        <Button
          onClick={onDownload}
          disabled={isGenerating}
          size="lg"
          className="min-h-[48px] min-w-[140px] px-8 text-base"
        >
          {isGenerating ? "Generating..." : downloadLabel}
        </Button>
      </div>
    </div>
  );
}
