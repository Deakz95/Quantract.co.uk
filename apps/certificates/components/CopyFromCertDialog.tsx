"use client";

import { useState } from "react";
import { Button, Input } from "@quantract/ui";
import { useCertificateStore, type StoredCertificate } from "../lib/certificateStore";
import { copySections, getSectionIntersection, SIGNATURE_SECTION_IDS } from "@quantract/shared/certificate-defaults";
import type { CertificateType } from "@quantract/shared/certificate-types";
import { getTypeSections } from "@quantract/shared/certificate-types";

interface CopyFromCertDialogProps {
  open: boolean;
  onClose: () => void;
  certType: CertificateType;
  currentData: Record<string, unknown>;
  onCopy: (mergedData: Record<string, unknown>) => void;
}

export function CopyFromCertDialog({
  open,
  onClose,
  certType,
  currentData,
  onCopy,
}: CopyFromCertDialogProps) {
  const { certificates } = useCertificateStore();
  const [selectedCertId, setSelectedCertId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  if (!open) return null;

  const filteredCerts = certificates.filter((c) => {
    if (!searchText) return true;
    const lower = searchText.toLowerCase();
    return (
      c.certificate_number.toLowerCase().includes(lower) ||
      (c.client_name || "").toLowerCase().includes(lower) ||
      (c.installation_address || "").toLowerCase().includes(lower) ||
      c.certificate_type.toLowerCase().includes(lower)
    );
  });

  const selectedCert = certificates.find((c) => c.id === selectedCertId);

  // Section intersection between source and target
  const availableSections = selectedCert
    ? getSectionIntersection(selectedCert.certificate_type as CertificateType, certType)
    : [];

  // Build label map for all types that might appear
  const sectionLabelMap: Record<string, string> = {};
  for (const s of getTypeSections(certType)) {
    sectionLabelMap[s.id] = s.label;
  }

  const handleSelectCert = (cert: StoredCertificate) => {
    setSelectedCertId(cert.id);
    // Pre-select all non-signature sections
    const intersection = getSectionIntersection(cert.certificate_type as CertificateType, certType);
    const initial = new Set(intersection.filter((id) => !SIGNATURE_SECTION_IDS.has(id)));
    setSelectedSections(initial);
  };

  const toggleSection = (sectionId: string) => {
    if (SIGNATURE_SECTION_IDS.has(sectionId)) return;
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

  const handleCopy = () => {
    if (!selectedCert) return;
    const result = copySections(
      certType,
      selectedCert.data,
      currentData,
      Array.from(selectedSections),
    );
    onCopy(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded w-full max-w-[600px] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] shrink-0">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Copy from Certificate</h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Select a certificate and choose which sections to copy
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Search */}
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search certificates by client, address, or reference..."
          />

          {!selectedCert ? (
            /* Certificate list */
            <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
              {filteredCerts.length === 0 ? (
                <div className="text-center py-6 text-[var(--muted-foreground)]">
                  <p className="text-sm">{certificates.length === 0 ? "No certificates found" : "No matching certificates"}</p>
                </div>
              ) : (
                filteredCerts.map((cert) => (
                  <button
                    key={cert.id}
                    onClick={() => handleSelectCert(cert)}
                    className="w-full text-left p-3 rounded-sm border border-[var(--border)] hover:bg-[var(--muted)]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-[var(--primary)]/15 text-[var(--primary)]">
                            {cert.certificate_type}
                          </span>
                          <span className="text-sm font-medium text-[var(--foreground)] truncate">
                            {cert.certificate_number}
                          </span>
                        </div>
                        {(cert.client_name || cert.installation_address) && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
                            {[cert.client_name, cert.installation_address].filter(Boolean).join(" — ")}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                        {new Date(cert.updated_at).toLocaleDateString("en-GB")}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Section picker */
            <>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => {
                    setSelectedCertId(null);
                    setSelectedSections(new Set());
                  }}
                  className="p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {selectedCert.certificate_number}
                  </span>
                  <span className="text-xs text-[var(--muted-foreground)] ml-2">
                    {selectedCert.client_name}
                  </span>
                </div>
              </div>

              <p className="text-xs text-[var(--muted-foreground)]">
                Select sections to copy ({selectedSections.size} selected)
              </p>
              <div className="space-y-1">
                {availableSections.map((sectionId) => {
                  const isSignature = SIGNATURE_SECTION_IDS.has(sectionId);
                  const isChecked = selectedSections.has(sectionId);
                  return (
                    <label
                      key={sectionId}
                      className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-colors ${
                        isSignature
                          ? "opacity-40 cursor-not-allowed"
                          : "cursor-pointer hover:bg-[var(--muted)]/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isSignature}
                        onChange={() => toggleSection(sectionId)}
                        className="w-4 h-4 rounded accent-[var(--primary)]"
                      />
                      <span className={`text-sm ${isSignature ? "text-[var(--muted-foreground)]" : "text-[var(--foreground)]"}`}>
                        {sectionLabelMap[sectionId] || sectionId}
                      </span>
                      {isSignature && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">(signatures not copied)</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border)] flex gap-3 justify-end shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCopy}
            disabled={!selectedCert || selectedSections.size === 0}
          >
            Copy Selected
          </Button>
        </div>
      </div>
    </div>
  );
}
