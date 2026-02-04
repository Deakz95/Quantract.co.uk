"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DocumentItem = {
  id: string;
  type: string;
  mimeType: string;
  sizeBytes: number;
  filename: string | null;
  createdAt: string;
  downloadUrl: string;
};

const TYPE_LABELS: Record<string, string> = {
  certificate_pdf: "Certificate",
  invoice_pdf: "Invoice",
  agreement_pdf: "Agreement",
  attachment: "Attachment",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function ClientDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/client/documents");
      const data = await res.json();
      if (data.ok) {
        setDocuments(data.documents || []);
      } else {
        setError(data.error || "Failed to load documents");
      }
    } catch {
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 rounded-xl bg-[var(--muted)]" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">{error}</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-[var(--muted-foreground)]">
            No documents yet.
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="text-sm font-semibold text-[var(--foreground)]">
                    {doc.filename || TYPE_LABELS[doc.type] || doc.type}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                    <span>{formatDate(doc.createdAt)}</span>
                    <span>{formatBytes(doc.sizeBytes)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{TYPE_LABELS[doc.type] || doc.type}</Badge>
                  <a href={doc.downloadUrl} target="_blank" rel="noreferrer">
                    <Button variant="secondary">Download</Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
