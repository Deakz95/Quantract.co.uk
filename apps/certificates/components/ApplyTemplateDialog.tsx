"use client";

import { useState } from "react";
import { Button } from "@quantract/ui";
import { useTemplateStore, type StoredTemplate } from "../lib/templateStore";
import { applyTemplate } from "@quantract/shared/certificate-defaults";
import type { CertificateType } from "@quantract/shared/certificate-types";
import { getTypeSections } from "@quantract/shared/certificate-types";

interface ApplyTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  certType: CertificateType;
  currentData: Record<string, unknown>;
  onApply: (mergedData: Record<string, unknown>) => void;
}

export function ApplyTemplateDialog({
  open,
  onClose,
  certType,
  currentData,
  onApply,
}: ApplyTemplateDialogProps) {
  const { getTemplatesForType, deleteTemplate } = useTemplateStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"fill_empty" | "overwrite">("fill_empty");

  if (!open) return null;

  const templates = getTemplatesForType(certType);
  const selected = templates.find((t) => t.id === selectedId);

  // Resolve section labels from registry
  const sectionLabelMap: Record<string, string> = {};
  for (const s of getTypeSections(certType)) {
    sectionLabelMap[s.id] = s.label;
  }

  const handleApply = () => {
    if (!selected) return;
    const result = applyTemplate(certType, selected.data, currentData, mode);
    onApply(result);
    onClose();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this template?")) return;
    deleteTemplate(id);
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-[560px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Apply Template</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Choose a saved template to apply to this certificate
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {templates.length === 0 ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">
              <p className="text-sm">No templates saved yet</p>
              <p className="text-xs mt-1">Use &quot;Save as Template&quot; in the sidebar to create one</p>
            </div>
          ) : (
            <>
              {/* Template list */}
              <div className="space-y-2">
                {templates.map((template) => (
                  <TemplateRow
                    key={template.id}
                    template={template}
                    isSelected={selectedId === template.id}
                    sectionLabelMap={sectionLabelMap}
                    onSelect={() => setSelectedId(template.id)}
                    onDelete={() => handleDelete(template.id)}
                  />
                ))}
              </div>

              {/* Apply mode toggle */}
              {selected && (
                <div className="border border-[var(--border)] rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Apply Mode</p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="applyMode"
                        checked={mode === "fill_empty"}
                        onChange={() => setMode("fill_empty")}
                        className="accent-[var(--primary)]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[var(--foreground)]">Fill empty fields only</span>
                        <p className="text-xs text-[var(--muted-foreground)]">Only fills fields that are currently empty</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="applyMode"
                        checked={mode === "overwrite"}
                        onChange={() => setMode("overwrite")}
                        className="accent-[var(--primary)]"
                      />
                      <div>
                        <span className="text-sm font-medium text-[var(--foreground)]">Overwrite</span>
                        <p className="text-xs text-[var(--muted-foreground)]">Replaces existing data with template values</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border)] flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={!selected}>Apply Template</Button>
        </div>
      </div>
    </div>
  );
}

function TemplateRow({
  template,
  isSelected,
  sectionLabelMap,
  onSelect,
  onDelete,
}: {
  template: StoredTemplate;
  isSelected: boolean;
  sectionLabelMap: Record<string, string>;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-xl border transition-all ${
        isSelected
          ? "border-[var(--primary)]/50 bg-[var(--primary)]/10"
          : "border-[var(--border)] hover:bg-[var(--muted)]/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-[var(--foreground)] truncate">{template.name}</span>
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-[var(--muted)] text-[var(--muted-foreground)]">
              {template.level}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {template.sectionIds.map((id) => (
              <span
                key={id}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--muted)]/60 text-[var(--muted-foreground)]"
              >
                {sectionLabelMap[id] || id}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          title="Delete template"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </button>
  );
}
