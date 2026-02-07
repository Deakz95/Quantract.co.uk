"use client";

import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import Link from "next/link";
import type { SaveStatus, ConflictState } from "../lib/saveTypes";
import { ApplyTemplateDialog } from "./ApplyTemplateDialog";
import { CopyFromCertDialog } from "./CopyFromCertDialog";
import { SaveAsTemplateDialog } from "./SaveAsTemplateDialog";
import type { CertificateType } from "@quantract/shared/certificate-types";

// ── Types ──

export type SectionStatus = "empty" | "partial" | "complete" | "error";

export interface SectionConfig {
  id: string;
  label: string;
  icon: ReactNode;
  getStatus: () => SectionStatus;
}

export type CertType = "EICR" | "EIC" | "MWC";

export interface QuickInfo {
  client?: string;
  site?: string;
  date?: string;
  reference?: string;
}

export interface ObservationCounts {
  c1: number;
  c2: number;
  c3: number;
  fi: number;
}

export interface StepValidationFeedback {
  ok: boolean;
  missing: string[];
  errors: { section: string; field: string; message: string }[];
}

interface CertificateLayoutProps {
  certType: CertType;
  sections: SectionConfig[];
  activeSection: string;
  onSectionChange: (id: string) => void;
  quickInfo: QuickInfo;
  observationCounts?: ObservationCounts;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  onSave: () => void;
  onDownload: () => void;
  isSaving: boolean;
  isGenerating: boolean;
  children: ReactNode;
  /** Workflow: validate before advancing to next step. Return null to allow, or errors to block. */
  onValidateStep?: (sectionId: string) => StepValidationFeedback | null;
  /** Conflict state from autosave — shows banner and locks form */
  conflict?: ConflictState | null;
  /** When true, form content is non-interactive */
  readOnly?: boolean;
  /** Template/copy callbacks and current data for template system */
  onApplyTemplate?: (mergedData: Record<string, unknown>) => void;
  onCopyFrom?: (mergedData: Record<string, unknown>) => void;
  currentData?: Record<string, unknown>;
}

// ── Constants ──

const CERT_META: Record<CertType, { title: string; shortTitle: string; standard: string }> = {
  EICR: { title: "Electrical Installation Condition Report", shortTitle: "EICR", standard: "BS 7671:2018+A2:2022" },
  EIC: { title: "Electrical Installation Certificate", shortTitle: "EIC", standard: "BS 7671:2018+A2:2022" },
  MWC: { title: "Minor Electrical Installation Works Certificate", shortTitle: "MWC", standard: "BS 7671:2018+A2:2022" },
};

// ── Icons ──

function StatusIcon({ status }: { status: SectionStatus }) {
  switch (status) {
    case "complete":
      return (
        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      );
    case "partial":
      return (
        <svg className="w-4 h-4 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM10 5a.75.75 0 01.75.75V10a.75.75 0 01-.75.75H6.5a.75.75 0 010-1.5H9.25V5.75A.75.75 0 0110 5z" clipRule="evenodd" />
        </svg>
      );
    case "error":
      return (
        <svg className="w-4 h-4 text-red-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      );
    default:
      return <div className="w-4 h-4 rounded-full border-2 border-[var(--muted-foreground)]/30" />;
  }
}

// Lucide-style section icons
export const SECTION_ICONS = {
  building: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" /><path d="M12 10h.01" /><path d="M12 14h.01" /><path d="M16 10h.01" /><path d="M16 14h.01" /><path d="M8 10h.01" /><path d="M8 14h.01" />
    </svg>
  ),
  mapPin: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  ruler: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" /><path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" />
    </svg>
  ),
  zap: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  plug: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" /><rect width="14" height="6" x="5" y="8" rx="1" /><path d="M5 14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2" />
    </svg>
  ),
  clipboardCheck: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" />
    </svg>
  ),
  layoutGrid: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
  barChart: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  ),
  eye: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  clipboardList: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" />
    </svg>
  ),
  target: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  penTool: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  camera: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" />
    </svg>
  ),
  wrench: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  fileText: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.32 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

// ── Keyboard shortcut help overlay ──

function ShortcutOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-[var(--foreground)] mb-4">Keyboard Shortcuts</h3>
        <div className="space-y-2 text-sm">
          {[
            ["Ctrl + S", "Save certificate"],
            ["Ctrl + P", "Download PDF"],
            ["Ctrl + \u2192", "Next section"],
            ["Ctrl + \u2190", "Previous section"],
            ["Ctrl + 1-9", "Jump to section"],
            ["Escape", "Close panel / modal"],
            ["?", "Toggle this help"],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-[var(--border)]/50 last:border-0">
              <span className="text-[var(--muted-foreground)]">{desc}</span>
              <kbd className="px-2 py-0.5 bg-[var(--muted)] rounded text-xs font-mono text-[var(--foreground)]">{key}</kbd>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 rounded-xl bg-[var(--muted)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--accent)] transition-colors">
          Close
        </button>
      </div>
    </div>
  );
}

// ── Main Layout ──

export function CertificateLayout({
  certType,
  sections,
  activeSection,
  onSectionChange,
  quickInfo,
  observationCounts,
  saveStatus,
  lastSaved,
  onSave,
  onDownload,
  isSaving,
  isGenerating,
  children,
  onValidateStep,
  conflict,
  readOnly,
  onApplyTemplate,
  onCopyFrom,
  currentData,
}: CertificateLayoutProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const meta = CERT_META[certType];
  const activeIdx = sections.findIndex((s) => s.id === activeSection);

  // Clear step errors when section changes
  useEffect(() => { setStepErrors([]); }, [activeSection]);

  // Progress calculation
  const completedCount = sections.filter((s) => s.getStatus() === "complete").length;
  const completionPercent = Math.round((completedCount / sections.length) * 100);

  const isFormLocked = readOnly || !!conflict;

  // Auto-save indicator text
  const saveIndicator = (() => {
    if (saveStatus === "offline") return "Offline \u2014 will sync";
    if (saveStatus === "saving") return "Saving\u2026";
    if (saveStatus === "saved" && lastSaved) {
      const ago = Math.round((Date.now() - lastSaved.getTime()) / 1000);
      if (ago < 5) return "Auto-saved just now";
      if (ago < 60) return `Auto-saved ${ago}s ago`;
      return `Auto-saved ${lastSaved.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
    }
    if (saveStatus === "error") return "Save failed";
    if (saveStatus === "dirty") return "Unsaved changes";
    return "Unsaved changes";
  })();

  // Navigation helpers
  const goToSection = useCallback((idx: number) => {
    if (idx >= 0 && idx < sections.length) {
      onSectionChange(sections[idx].id);
      rightPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [sections, onSectionChange]);

  const goPrev = useCallback(() => goToSection(activeIdx - 1), [activeIdx, goToSection]);

  // Forward navigation with optional validation gating
  const goNext = useCallback(() => {
    if (onValidateStep) {
      const result = onValidateStep(activeSection);
      if (result && !result.ok) {
        setStepErrors(result.missing);
        return; // Block advancement
      }
    }
    setStepErrors([]);
    goToSection(activeIdx + 1);
  }, [activeIdx, activeSection, goToSection, onValidateStep]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        // Allow Ctrl+S even in inputs
        if (!(e.ctrlKey && e.key === "s")) return;
      }

      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        onSave();
      } else if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        onDownload();
      } else if (e.ctrlKey && e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.ctrlKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.ctrlKey && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        goToSection(parseInt(e.key) - 1);
      } else if (e.key === "Escape") {
        setShowShortcuts(false);
        setMobileNavOpen(false);
      } else if (e.key === "?" && !e.ctrlKey && !e.shiftKey) {
        setShowShortcuts((p) => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave, onDownload, goNext, goPrev, goToSection]);

  // Close mobile nav when section changes
  useEffect(() => { setMobileNavOpen(false); }, [activeSection]);

  const prevSection = activeIdx > 0 ? sections[activeIdx - 1] : null;
  const nextSection = activeIdx < sections.length - 1 ? sections[activeIdx + 1] : null;
  const isLastSection = activeIdx === sections.length - 1;

  return (
    <div className="h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] overflow-hidden">
      {/* ── Header ── */}
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--card)]">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors shrink-0" title="Back to dashboard">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            {/* Mobile nav toggle */}
            <button
              onClick={() => setMobileNavOpen((p) => !p)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
              title="Toggle sections"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold truncate">{meta.shortTitle}</span>
                <span className="hidden sm:inline px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/20">
                  Draft
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] truncate">
                <span className="hidden sm:inline">{meta.standard} &middot; </span>
                <span className={saveStatus === "error" ? "text-red-400" : saveStatus === "saved" ? "text-emerald-400" : saveStatus === "offline" ? "text-amber-400" : "text-[var(--muted-foreground)]"}>
                  {saveIndicator}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isFormLocked && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20">
                Read only
              </span>
            )}
            {!isFormLocked && onApplyTemplate && currentData && (
              <button
                onClick={() => setShowTemplateDialog(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] transition-colors"
                title="Apply template"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></svg>
                Templates
              </button>
            )}
            {!isFormLocked && onCopyFrom && currentData && (
              <button
                onClick={() => setShowCopyDialog(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] transition-colors"
                title="Copy from another certificate"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                Copy
              </button>
            )}
            <button
              onClick={onSave}
              disabled={isSaving || isFormLocked}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] transition-colors disabled:opacity-50"
            >
              {saveStatus === "saving" ? (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
              ) : saveStatus === "saved" ? (
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              ) : null}
              Save
            </button>
            <button
              onClick={onDownload}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="hidden sm:inline">{isGenerating ? "Generating\u2026" : "PDF"}</span>
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              title="Keyboard shortcuts"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><circle cx="12" cy="17" r=".5" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Body: Split Panel ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile nav overlay */}
        {mobileNavOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setMobileNavOpen(false)} />
        )}

        {/* ── Left Panel ── */}
        <aside className={`
          ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          fixed lg:static inset-y-0 left-0 z-40 lg:z-auto
          w-72 md:w-80 lg:w-[320px] xl:w-[340px]
          bg-[var(--card)] border-r border-[var(--border)]
          flex flex-col overflow-hidden
          transition-transform duration-200 ease-out
          lg:transition-none
          top-0 lg:top-auto
        `}>
          {/* Mobile close button */}
          <div className="lg:hidden flex items-center justify-between p-3 border-b border-[var(--border)]">
            <span className="text-sm font-semibold">Sections</span>
            <button onClick={() => setMobileNavOpen(false)} className="p-1 rounded hover:bg-[var(--muted)]">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Section navigation */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {sections.map((section, idx) => {
              const status = section.getStatus();
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  onClick={() => onSectionChange(section.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-150
                    ${isActive
                      ? "bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-[var(--foreground)] shadow-sm shadow-[var(--primary)]/5"
                      : "border border-transparent hover:bg-[var(--muted)]/60 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }
                  `}
                >
                  <span className={`shrink-0 ${isActive ? "text-[var(--primary)]" : ""}`}>{section.icon}</span>
                  <span className={`flex-1 truncate ${isActive ? "font-semibold" : "font-medium"}`}>
                    <span className="text-[var(--muted-foreground)] mr-1.5">{idx + 1}.</span>
                    {section.label}
                  </span>
                  <StatusIcon status={status} />
                </button>
              );
            })}
          </nav>

          {/* Bottom cards */}
          <div className="shrink-0 p-3 space-y-3 border-t border-[var(--border)]">
            {/* Progress */}
            <div className="rounded-xl bg-[var(--muted)]/40 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Completion</span>
                <span className="text-xs font-bold text-[var(--foreground)]">{completionPercent}%</span>
              </div>
              <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${completionPercent}%`,
                    background: completionPercent === 100
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : completionPercent > 50
                        ? "linear-gradient(90deg, #3b82f6, #60a5fa)"
                        : "linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 70%, white))",
                  }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--muted-foreground)]">
                {completedCount} of {sections.length} sections complete
              </p>
            </div>

            {/* Observation Summary (EICR only) */}
            {observationCounts && (
              <div className="rounded-xl bg-[var(--muted)]/40 p-3">
                <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Observations</p>
                <div className="flex gap-2">
                  {[
                    { label: "C1", count: observationCounts.c1, color: "bg-red-500/20 text-red-400 border-red-500/30" },
                    { label: "C2", count: observationCounts.c2, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
                    { label: "C3", count: observationCounts.c3, color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
                    { label: "FI", count: observationCounts.fi, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
                  ].map((o) => (
                    <div key={o.label} className={`flex-1 text-center py-1.5 rounded-lg border text-xs font-bold ${o.color}`}>
                      <div className="text-base leading-none">{o.count}</div>
                      <div className="mt-0.5 opacity-80">{o.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Info */}
            <div className="rounded-xl bg-[var(--muted)]/40 p-3">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Quick Info</p>
              <div className="space-y-1 text-xs">
                {[
                  { label: "Client", value: quickInfo.client },
                  { label: "Site", value: quickInfo.site },
                  { label: "Date", value: quickInfo.date || new Date().toLocaleDateString("en-GB") },
                  { label: "Ref", value: quickInfo.reference },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-[var(--muted-foreground)] w-10 shrink-0">{item.label}</span>
                    <span className={`truncate ${item.value ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                      {item.value || "\u2014"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Save as Template */}
            {!isFormLocked && currentData && (
              <button
                onClick={() => setShowSaveTemplateDialog(true)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-[var(--muted)]/60 hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save as Template
              </button>
            )}
          </div>
        </aside>

        {/* ── Right Panel ── */}
        <div ref={rightPanelRef} className="flex-1 overflow-y-auto">
          <div className={`${activeSection === "boards" ? "w-full px-4 md:px-6" : "max-w-4xl mx-auto px-4 md:px-8"} py-6`}>
            {/* Section heading */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[var(--primary)]">{sections[activeIdx]?.icon}</span>
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  <span className="text-[var(--muted-foreground)] mr-1">{activeIdx + 1}.</span>
                  {sections[activeIdx]?.label}
                </h2>
              </div>
              <div className="ml-7 h-0.5 w-12 rounded-full bg-[var(--primary)]/40" />
            </div>

            {/* Conflict banner */}
            {conflict && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-300">This certificate was updated elsewhere</p>
                    <p className="text-sm text-red-200/80 mt-0.5">{conflict.message || "Reload to continue."}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step validation errors */}
            {stepErrors.length > 0 && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-300 mb-1">Complete this section to continue</p>
                    <ul className="text-sm text-amber-200/80 space-y-0.5">
                      {stepErrors.map((err) => (
                        <li key={err} className="flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                          {err.charAt(0).toUpperCase() + err.slice(1)}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    onClick={() => setStepErrors([])}
                    className="p-1 rounded hover:bg-amber-500/20 text-amber-400 transition-colors shrink-0"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            )}

            {/* Form content */}
            <div className={`min-h-[60vh]${isFormLocked ? " pointer-events-none opacity-60" : ""}`}>
              {children}
            </div>

            {/* Previous / Next navigation */}
            <div className="mt-8 pt-6 border-t border-[var(--border)] flex items-center justify-between gap-4">
              {prevSection ? (
                <button
                  onClick={goPrev}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--muted)] hover:bg-[var(--accent)] text-[var(--foreground)] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  <span className="hidden sm:inline">{prevSection.label}</span>
                  <span className="sm:hidden">Previous</span>
                </button>
              ) : <div />}
              {nextSection ? (
                <button
                  onClick={goNext}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
                >
                  <span className="hidden sm:inline">{nextSection.label}</span>
                  <span className="sm:hidden">Next</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                </button>
              ) : isLastSection ? (
                <button
                  onClick={onSave}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                >
                  Review & Complete
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </button>
              ) : <div />}
            </div>
          </div>
        </div>
      </div>

      {/* Shortcut overlay */}
      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}

      {/* Template / Copy / Save-as-Template dialogs */}
      {showTemplateDialog && onApplyTemplate && currentData && (
        <ApplyTemplateDialog
          open={showTemplateDialog}
          onClose={() => setShowTemplateDialog(false)}
          certType={certType as CertificateType}
          currentData={currentData}
          onApply={onApplyTemplate}
        />
      )}
      {showCopyDialog && onCopyFrom && currentData && (
        <CopyFromCertDialog
          open={showCopyDialog}
          onClose={() => setShowCopyDialog(false)}
          certType={certType as CertificateType}
          currentData={currentData}
          onCopy={onCopyFrom}
        />
      )}
      {showSaveTemplateDialog && currentData && (
        <SaveAsTemplateDialog
          open={showSaveTemplateDialog}
          onClose={() => setShowSaveTemplateDialog(false)}
          certType={certType as CertificateType}
          currentData={currentData}
        />
      )}
    </div>
  );
}
