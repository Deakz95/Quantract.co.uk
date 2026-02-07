"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@quantract/ui";
import {
  useSignatureAssetStore,
  type SignatureRole,
  type SignatureAsset,
} from "../../../lib/signatureAssets";
import { SignaturePad } from "../../../components/signatures/SignaturePad";

const ROLE_GROUPS: { role: SignatureRole; label: string; description: string }[] = [
  { role: "engineer", label: "Engineer", description: "Primary signing role for inspections and testing" },
  { role: "inspector", label: "Inspector", description: "For condition reports and periodic inspections" },
  { role: "installer", label: "Installer", description: "For minor works and construction" },
  { role: "designer", label: "Designer", description: "For EIC design certification" },
  { role: "supervisor", label: "Supervisor", description: "For countersigning and review" },
  { role: "client", label: "Client", description: "For client acknowledgement sections" },
  { role: "contractor", label: "Contractor", description: "For contractor declarations" },
];

export default function SignaturesSettingsPage() {
  const { assets, addAsset, deleteAsset, setDefault, updateLabel } = useSignatureAssetStore();
  const [addingForRole, setAddingForRole] = useState<SignatureRole | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const handleAddSignature = (dataUrl: string) => {
    if (!addingForRole) return;
    addAsset({
      id: crypto.randomUUID(),
      role: addingForRole,
      label: newLabel.trim() || `${addingForRole} signature`,
      dataUrl,
      createdAt: new Date().toISOString(),
      isDefault: false,
    });
    setAddingForRole(null);
    setNewLabel("");
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this saved signature?")) return;
    deleteAsset(id);
  };

  const handleStartEdit = (asset: SignatureAsset) => {
    setEditingId(asset.id);
    setEditLabel(asset.label);
  };

  const handleSaveEdit = () => {
    if (editingId && editLabel.trim()) {
      updateLabel(editingId, editLabel.trim());
    }
    setEditingId(null);
    setEditLabel("");
  };

  // Group assets by role
  const assetsByRole: Record<string, SignatureAsset[]> = {};
  for (const asset of assets) {
    if (!assetsByRole[asset.role]) assetsByRole[asset.role] = [];
    assetsByRole[asset.role].push(asset);
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
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
            <h1 className="text-lg font-bold">Saved Signatures</h1>
            <p className="text-xs text-[var(--muted-foreground)]">Manage your saved signatures for quick reuse</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-8">
        {/* Add new signature modal */}
        {addingForRole && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setAddingForRole(null)}>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl w-full max-w-[520px]" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-[var(--border)]">
                <h2 className="text-lg font-bold text-[var(--foreground)]">
                  New {ROLE_GROUPS.find((r) => r.role === addingForRole)?.label} Signature
                </h2>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">
                  Draw your signature below — multiple strokes supported
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <Label htmlFor="sigLabel">Label</Label>
                  <Input
                    id="sigLabel"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder={`e.g. Main ${addingForRole}, John Smith`}
                  />
                </div>
                <SignaturePad
                  onSave={handleAddSignature}
                  onCancel={() => { setAddingForRole(null); setNewLabel(""); }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Role groups */}
        {ROLE_GROUPS.map(({ role, label, description }) => {
          const roleAssets = assetsByRole[role] || [];
          return (
            <section key={role} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[var(--foreground)]">{label}</h2>
                  <p className="text-xs text-[var(--muted-foreground)]">{description}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => { setAddingForRole(role); setNewLabel(""); }}
                >
                  + Add
                </Button>
              </div>

              {roleAssets.length === 0 ? (
                <div className="border border-dashed border-[var(--border)] rounded-xl p-4 text-center text-sm text-[var(--muted-foreground)]">
                  No saved signatures for this role
                </div>
              ) : (
                <div className="space-y-2">
                  {roleAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                        asset.isDefault
                          ? "border-[var(--primary)]/30 bg-[var(--primary)]/5"
                          : "border-[var(--border)]"
                      }`}
                    >
                      {/* Preview */}
                      <div className="w-20 h-12 border border-[var(--border)] rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.dataUrl}
                          alt={asset.label}
                          className="max-h-[40px] max-w-[72px]"
                        />
                      </div>

                      {/* Label */}
                      <div className="min-w-0 flex-1">
                        {editingId === asset.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              className="text-sm h-8"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit();
                                if (e.key === "Escape") setEditingId(null);
                              }}
                            />
                            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(asset)}
                              className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors text-left truncate block"
                              title="Click to rename"
                            >
                              {asset.label}
                            </button>
                            <p className="text-[10px] text-[var(--muted-foreground)]">
                              {new Date(asset.createdAt).toLocaleDateString("en-GB")}
                              {asset.isDefault && (
                                <span className="ml-2 text-[var(--primary)] font-medium">Default</span>
                              )}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!asset.isDefault && (
                          <button
                            onClick={() => setDefault(asset.id)}
                            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                            title="Set as default"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}
