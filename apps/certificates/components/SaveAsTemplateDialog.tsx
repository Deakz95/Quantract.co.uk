"use client";

import { useState } from "react";
import { Button, Input, Label } from "@quantract/ui";
import { useTemplateStore } from "../lib/templateStore";
import { extractSectionData, SIGNATURE_SECTION_IDS } from "@quantract/shared/certificate-defaults";
import type { CertificateType } from "@quantract/shared/certificate-types";
import { getTypeSections } from "@quantract/shared/certificate-types";

interface SaveAsTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  certType: CertificateType;
  currentData: Record<string, unknown>;
}

export function SaveAsTemplateDialog({
  open,
  onClose,
  certType,
  currentData,
}: SaveAsTemplateDialogProps) {
  const { addTemplate } = useTemplateStore();
  const [name, setName] = useState("");
  const [level, setLevel] = useState<"company" | "engineer">("engineer");

  const sections = getTypeSections(certType).filter(
    (s) => !SIGNATURE_SECTION_IDS.has(s.id) && s.id !== "photos"
  );

  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    () => new Set(sections.map((s) => s.id))
  );

  if (!open) return null;

  const toggleSection = (sectionId: string) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!name.trim() || selectedSections.size === 0) return;

    const sectionIds = Array.from(selectedSections);
    const data = extractSectionData(currentData, sectionIds);

    const now = new Date().toISOString();
    addTemplate({
      id: crypto.randomUUID(),
      name: name.trim(),
      certificateType: certType,
      level,
      data,
      sectionIds,
      created_at: now,
      updated_at: now,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Save as Template</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Save the current certificate data as a reusable template
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Template name */}
          <div>
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Domestic EICR, Commercial Standard"
              autoFocus
            />
          </div>

          {/* Level */}
          <div className="space-y-2">
            <Label>Template Level</Label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="templateLevel"
                  checked={level === "engineer"}
                  onChange={() => setLevel("engineer")}
                  className="accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground)]">Engineer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="templateLevel"
                  checked={level === "company"}
                  onChange={() => setLevel("company")}
                  className="accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground)]">Company</span>
              </label>
            </div>
          </div>

          {/* Section selection */}
          <div className="space-y-2">
            <Label>Sections to Include ({selectedSections.size} selected)</Label>
            <div className="border border-[var(--border)] rounded-xl p-3 space-y-1 max-h-[250px] overflow-y-auto">
              {sections.map((section) => (
                <label
                  key={section.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[var(--muted)]/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedSections.has(section.id)}
                    onChange={() => toggleSection(section.id)}
                    className="w-4 h-4 rounded accent-[var(--primary)]"
                  />
                  <span className="text-sm text-[var(--foreground)]">{section.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border)] flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || selectedSections.size === 0}
          >
            Save Template
          </Button>
        </div>
      </div>
    </div>
  );
}
