// src/components/docs/DownloadPackModal.tsx
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildSignedPackItems } from "@/lib/docPack";

export default function DownloadPackModal({
  open,
  onClose,
  quoteId,
}: {
  open: boolean;
  onClose: () => void;
  quoteId: string;
}) {
  const [busy, setBusy] = useState(false);

  const items = useMemo(
    () =>
      buildSignedPackItems({
        hasQuotePdf: true,
        hasAgreementPdf: true,
        hasTermsPdf: true,
        hasCertificate: true,
      }),
    []
  );

  async function download() {
    setBusy(true);
    try {
      // TODO backend:
      // GET /api/quotes/{quoteId}/signed-pack -> returns ZIP/PDF bundle
      // DEMO: download a tiny text file
      const content = `SIGNED PACK (DEMO)
Quote: ${quoteId}
Contains: ${items.map((i) => i.label).join(", ")}
`;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quoteId}-signed-pack-demo.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Download signed pack</CardTitle>
              <Button variant="ghost" type="button" onClick={onClose}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                <div className="text-xs font-semibold text-[var(--foreground)]">Includes</div>
                <div className="mt-3 space-y-2">
                  {items.map((i) => (
                    <div key={i.key} className="flex items-center justify-between">
                      <div className="text-sm text-[var(--muted-foreground)]">{i.label}</div>
                      <Badge>{i.status === "ready" ? "Ready" : "Missing"}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" onClick={download} disabled={busy}>
                  {busy ? "Preparing…" : "Download"}
                </Button>
              </div>

              <p className="text-xs text-[var(--muted-foreground)]">
                Production: return a ZIP containing PDFs + certificate JSON. Store hashes server-side.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
