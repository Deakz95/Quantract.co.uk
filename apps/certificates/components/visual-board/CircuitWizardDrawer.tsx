"use client";

import { useEffect, useCallback } from "react";
import type { BoardCircuit } from "@quantract/shared/certificate-types";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { SubCard } from "../ui/SubCard";
import { FloatingInput } from "../ui/FloatingInput";
import { FloatingSelect } from "../ui/FloatingSelect";
import { PillSelector } from "../ui/PillSelector";

interface CircuitWizardDrawerProps {
  circuit: BoardCircuit;
  circuitIndex: number;
  totalCircuits: number;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (field: string, value: unknown) => void;
  onNavigate: (direction: "prev" | "next") => void;
  boardType: string;
}

const STATUS_OPTIONS = [
  { label: "Pass", value: "Pass" },
  { label: "C1", value: "C1" },
  { label: "C2", value: "C2" },
  { label: "C3", value: "C3" },
  { label: "FI", value: "FI" },
  { label: "N/A", value: "N/A" },
  { label: "LIM", value: "LIM" },
];

export function CircuitWizardDrawer({
  circuit,
  circuitIndex,
  totalCircuits,
  isOpen,
  onClose,
  onUpdate,
  onNavigate,
  boardType,
}: CircuitWizardDrawerProps) {
  // Keyboard: Escape closes, ArrowLeft/Right navigate
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA";

      if (e.key === "Escape") {
        onClose();
      } else if (!isInput) {
        if (e.key === "ArrowLeft" && circuitIndex > 0) {
          onNavigate("prev");
        } else if (e.key === "ArrowRight" && circuitIndex < totalCircuits - 1) {
          onNavigate("next");
        }
      }
    },
    [isOpen, onClose, onNavigate, circuitIndex, totalCircuits]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const val = (key: keyof BoardCircuit) => String((circuit as Record<string, unknown>)[key] ?? "");
  const boolVal = (key: keyof BoardCircuit) => Boolean((circuit as Record<string, unknown>)[key]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 max-sm:w-full bg-[var(--card)] border-l border-[var(--border)] shadow-2xl z-50 transition-transform duration-300 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--muted)]/50 shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate("prev")}
              disabled={circuitIndex <= 0}
              className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium text-[var(--foreground)]">
              Circuit {circuitIndex + 1} of {totalCircuits}
            </span>
            <button
              onClick={() => onNavigate("next")}
              disabled={circuitIndex >= totalCircuits - 1}
              className="p-1 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="w-7" /> {/* Spacer to center nav */}
        </div>

        {/* Description subtitle */}
        {circuit.description && (
          <div className="px-4 py-2 border-b border-[var(--border)]">
            <p className="text-sm text-[var(--muted-foreground)] truncate">{circuit.description}</p>
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ scrollbarWidth: "thin" }}>
          {/* Status */}
          <SubCard title="Status" accentColor="#3b82f6">
            <PillSelector
              options={STATUS_OPTIONS}
              value={val("status")}
              onChange={(v) => onUpdate("status", v)}
            />
            <div className="mt-3">
              <FloatingInput
                label="Observation Code"
                value={val("observationCode")}
                onChange={(e) => onUpdate("observationCode", e.target.value)}
              />
            </div>
          </SubCard>

          {/* Circuit Identity */}
          <SubCard title="Circuit Identity" accentColor="#8b5cf6">
            <div className="space-y-3">
              <FloatingInput
                label="Description"
                value={val("description")}
                onChange={(e) => onUpdate("description", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <FloatingSelect
                  label="Wiring Type"
                  value={val("typeOfWiring")}
                  onChange={(e) => onUpdate("typeOfWiring", e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="T+E">T+E</option>
                  <option value="SWA">SWA</option>
                  <option value="MICC">MICC</option>
                  <option value="Flex">Flex</option>
                  <option value="Conduit">Conduit</option>
                  <option value="Trunking">Trunking</option>
                  <option value="Other">Other</option>
                </FloatingSelect>
                <FloatingSelect
                  label="Ref Method"
                  value={val("referenceMethod")}
                  onChange={(e) => onUpdate("referenceMethod", e.target.value)}
                >
                  <option value="">Select...</option>
                  {["A", "B", "C", "100", "101", "102", "103"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </FloatingSelect>
              </div>
              <FloatingInput
                label="Number of Points"
                value={val("numberOfPoints")}
                onChange={(e) => onUpdate("numberOfPoints", e.target.value)}
                type="text"
              />
              {boardType === "three-phase" && (
                <FloatingSelect
                  label="Phase"
                  value={val("phase")}
                  onChange={(e) => onUpdate("phase", e.target.value)}
                >
                  <option value="">Select...</option>
                  <option value="L1">L1</option>
                  <option value="L2">L2</option>
                  <option value="L3">L3</option>
                  <option value="TPN">TP&N</option>
                  <option value="3P">3P</option>
                </FloatingSelect>
              )}
            </div>
          </SubCard>

          {/* Conductor Details */}
          <SubCard title="Conductor Details" accentColor="#06b6d4">
            <div className="grid grid-cols-2 gap-3">
              <FloatingSelect
                label="Live CSA (mm²)"
                value={val("liveCsa")}
                onChange={(e) => onUpdate("liveCsa", e.target.value)}
              >
                <option value="">Select...</option>
                {["1.0", "1.5", "2.5", "4.0", "6.0", "10.0", "16.0", "25.0"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </FloatingSelect>
              <FloatingSelect
                label="CPC CSA (mm²)"
                value={val("cpcCsa")}
                onChange={(e) => onUpdate("cpcCsa", e.target.value)}
              >
                <option value="">Select...</option>
                {["1.0", "1.5", "2.5", "4.0", "6.0", "10.0", "16.0", "25.0"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </FloatingSelect>
            </div>
            <div className="mt-3">
              <FloatingSelect
                label="Max Disconnection Time"
                value={val("maxDisconnectionTime")}
                onChange={(e) => onUpdate("maxDisconnectionTime", e.target.value)}
              >
                <option value="">Select...</option>
                {["0.1", "0.2", "0.4", "5", "N/A"].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </FloatingSelect>
            </div>
          </SubCard>

          {/* Protective Device */}
          <SubCard title="Protective Device" accentColor="#f59e0b">
            <div className="space-y-3">
              <FloatingInput
                label="BS(EN)"
                value={val("ocpdBsEn")}
                onChange={(e) => onUpdate("ocpdBsEn", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <FloatingSelect
                  label="Type"
                  value={val("ocpdType")}
                  onChange={(e) => onUpdate("ocpdType", e.target.value)}
                >
                  <option value="">Select...</option>
                  {["B", "C", "D", "1", "2", "3"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </FloatingSelect>
                <FloatingSelect
                  label="Rating (A)"
                  value={val("ocpdRating")}
                  onChange={(e) => onUpdate("ocpdRating", e.target.value)}
                >
                  <option value="">Select...</option>
                  {["6", "10", "16", "20", "25", "32", "40", "50", "63", "80", "100"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </FloatingSelect>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FloatingSelect
                  label="Breaking Cap (kA)"
                  value={val("breakingCapacity")}
                  onChange={(e) => onUpdate("breakingCapacity", e.target.value)}
                >
                  <option value="">Select...</option>
                  {["6", "10", "16"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </FloatingSelect>
                <FloatingInput
                  label="Max Permitted Zs"
                  value={val("maxPermittedZs")}
                  onChange={(e) => onUpdate("maxPermittedZs", e.target.value)}
                />
              </div>
            </div>
          </SubCard>

          {/* RCD Details */}
          <SubCard title="RCD Details" accentColor="#ec4899">
            <div className="space-y-3">
              <FloatingInput
                label="BS(EN)"
                value={val("rcdBsEn")}
                onChange={(e) => onUpdate("rcdBsEn", e.target.value)}
              />
              <div className="grid grid-cols-3 gap-3">
                <FloatingSelect
                  label="Type"
                  value={val("rcdType")}
                  onChange={(e) => onUpdate("rcdType", e.target.value)}
                >
                  <option value="">Select...</option>
                  {["AC", "A", "F", "B", "S", "N/A"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </FloatingSelect>
                <FloatingSelect
                  label="I&Delta;n (mA)"
                  value={val("rcdRatedCurrent")}
                  onChange={(e) => onUpdate("rcdRatedCurrent", e.target.value)}
                >
                  <option value="">Select...</option>
                  {["10", "30", "100", "300", "500", "N/A"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </FloatingSelect>
                <FloatingSelect
                  label="Rating (A)"
                  value={val("rcdRating")}
                  onChange={(e) => onUpdate("rcdRating", e.target.value)}
                >
                  <option value="">Select...</option>
                  {["40", "63", "80", "100"].map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </FloatingSelect>
              </div>
            </div>
          </SubCard>

          {/* Test Results */}
          <SubCard title="Test Results" accentColor="#10b981">
            <div className="space-y-4">
              {/* Continuity — Ring */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Continuity — Ring Final Circuit
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <FloatingInput
                    label="r1 (&Omega;)"
                    value={val("ringR1")}
                    onChange={(e) => onUpdate("ringR1", e.target.value)}
                  />
                  <FloatingInput
                    label="rn (&Omega;)"
                    value={val("ringRn")}
                    onChange={(e) => onUpdate("ringRn", e.target.value)}
                  />
                  <FloatingInput
                    label="r2 (&Omega;)"
                    value={val("ringR2")}
                    onChange={(e) => onUpdate("ringR2", e.target.value)}
                  />
                </div>
              </div>

              {/* Continuity — Radial */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Continuity — Radial
                </p>
                <FloatingInput
                  label="R1+R2 (&Omega;)"
                  value={val("r1PlusR2")}
                  onChange={(e) => onUpdate("r1PlusR2", e.target.value)}
                />
              </div>

              {/* Insulation Resistance */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Insulation Resistance
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <FloatingSelect
                    label="Test V"
                    value={val("irTestVoltage")}
                    onChange={(e) => onUpdate("irTestVoltage", e.target.value)}
                  >
                    <option value="">Select...</option>
                    {["250", "500", "1000"].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </FloatingSelect>
                  <FloatingInput
                    label="L-L (M&Omega;)"
                    value={val("irLiveLive")}
                    onChange={(e) => onUpdate("irLiveLive", e.target.value)}
                  />
                  <FloatingInput
                    label="L-E (M&Omega;)"
                    value={val("irLiveEarth")}
                    onChange={(e) => onUpdate("irLiveEarth", e.target.value)}
                  />
                </div>
              </div>

              {/* Zs */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  Earth Fault Loop Impedance (Zs)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FloatingInput
                    label="Zs Measured (&Omega;)"
                    value={val("zsMeasured")}
                    onChange={(e) => onUpdate("zsMeasured", e.target.value)}
                  />
                  <FloatingInput
                    label="Zs Maximum (&Omega;)"
                    value={val("zsMaximum")}
                    onChange={(e) => onUpdate("zsMaximum", e.target.value)}
                  />
                </div>
              </div>

              {/* RCD Test */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  RCD Test
                </p>
                <FloatingInput
                  label="Disconnection Time (ms)"
                  value={val("rcdDisconnectionTime")}
                  onChange={(e) => onUpdate("rcdDisconnectionTime", e.target.value)}
                />
              </div>

              {/* AFDD */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  AFDD
                </p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={boolVal("afddTestButton")}
                      onChange={(e) => onUpdate("afddTestButton", e.target.checked)}
                      className="w-4 h-4 rounded accent-[var(--primary)]"
                    />
                    <span className="text-xs text-[var(--foreground)]">Test Button</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={boolVal("afddManualTest")}
                      onChange={(e) => onUpdate("afddManualTest", e.target.checked)}
                      className="w-4 h-4 rounded accent-[var(--primary)]"
                    />
                    <span className="text-xs text-[var(--foreground)]">Manual Test</span>
                  </label>
                </div>
              </div>

              {/* Polarity */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={boolVal("polarityConfirmed")}
                    onChange={(e) => onUpdate("polarityConfirmed", e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--primary)]"
                  />
                  <span className="text-xs text-[var(--foreground)]">Polarity Confirmed</span>
                </label>
              </div>
            </div>
          </SubCard>
        </div>
      </div>
    </>
  );
}
