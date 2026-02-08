"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Textarea } from "@quantract/ui";
import {
  useCertificateDefaultsStore,
  STANDARD_INTERVALS,
  type CertificateTypeDefaults,
} from "../../../lib/certificateDefaultsStore";
import type { CertificateType } from "@quantract/shared/certificate-types";

const CERT_TYPES: { type: CertificateType; label: string; hasInterval: boolean }[] = [
  { type: "EIC", label: "EIC — Electrical Installation Certificate", hasInterval: true },
  { type: "EICR", label: "EICR — Condition Report", hasInterval: true },
  { type: "MWC", label: "MWC — Minor Works Certificate", hasInterval: true },
  { type: "FIRE", label: "Fire Alarm Certificate", hasInterval: true },
  { type: "EML", label: "Emergency Lighting Certificate", hasInterval: true },
];

export default function CertificateDefaultsPage() {
  const { defaults, updateDefaults, clearDefaults } = useCertificateDefaultsStore();
  const [activeType, setActiveType] = useState<CertificateType>("EICR");

  const current = defaults[activeType] ?? {};

  const update = (partial: Partial<CertificateTypeDefaults>) => {
    updateDefaults(activeType, partial);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold">Certificate Defaults</h1>
            <p className="text-xs text-[var(--muted-foreground)]">
              Set default inspection intervals, retest wording, and declaration text per certificate type
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Type tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-[var(--muted)]/50 rounded-xl">
          {CERT_TYPES.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeType === type
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="text-sm text-[var(--muted-foreground)]">
          {CERT_TYPES.find((t) => t.type === activeType)?.label}
        </div>

        {/* Defaults form */}
        <div className="border border-[var(--border)] rounded-xl p-5 bg-[var(--card)] space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="inspectionInterval">Default Inspection Interval (years)</Label>
              <Input
                id="inspectionInterval"
                type="number"
                min={1}
                max={25}
                value={current.inspectionInterval ?? ""}
                onChange={(e) => update({ inspectionInterval: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 5"
              />
              <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                BS 7671 recommendations: Domestic 10yr, Commercial 5yr, Industrial 3yr
              </p>
            </div>
            <div>
              <Label htmlFor="retestDateOffset">Default Retest Date (years from inspection)</Label>
              <Input
                id="retestDateOffset"
                type="number"
                min={1}
                max={25}
                value={current.retestDateOffset ?? ""}
                onChange={(e) => update({ retestDateOffset: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="e.g. 5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="retestWording">Retest Wording</Label>
            <Textarea
              id="retestWording"
              value={current.retestWording ?? ""}
              onChange={(e) => update({ retestWording: e.target.value })}
              placeholder="e.g. This installation should be re-inspected no later than the date shown above..."
              className="min-h-[80px]"
            />
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
              This text appears on the certificate near the retest recommendation
            </p>
          </div>

          <div>
            <Label htmlFor="declarationText">Declaration Text Override</Label>
            <Textarea
              id="declarationText"
              value={current.declarationText ?? ""}
              onChange={(e) => update({ declarationText: e.target.value })}
              placeholder="Leave blank to use the standard BS 7671 declaration text..."
              className="min-h-[100px]"
            />
            <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
              If set, this replaces the default declaration text for {activeType} certificates
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (confirm(`Reset all defaults for ${activeType}?`)) {
                  clearDefaults(activeType);
                }
              }}
            >
              Reset to Standard
            </Button>
            <p className="text-[10px] text-[var(--muted-foreground)]">
              Changes are saved automatically
            </p>
          </div>
        </div>

        {/* Standard intervals reference */}
        <details className="border border-[var(--border)] rounded-xl overflow-hidden">
          <summary className="bg-[var(--muted)]/50 px-4 py-3 cursor-pointer text-sm font-medium text-[var(--foreground)] select-none">
            BS 7671 Standard Intervals Reference
          </summary>
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(STANDARD_INTERVALS).map(([type, years]) => (
              <div key={type} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--muted)]/30">
                <span className="text-[var(--foreground)] capitalize">{type.replace(/-/g, " ")}</span>
                <span className="text-[var(--muted-foreground)] font-mono">{years}yr</span>
              </div>
            ))}
          </div>
        </details>
      </main>
    </div>
  );
}
