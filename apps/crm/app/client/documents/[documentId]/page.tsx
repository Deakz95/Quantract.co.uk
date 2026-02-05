"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type DocumentDetail = {
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
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

const LS_KEY = "qt_recent_docs";

function recordRecentDoc(id: string, title: string, type: string) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const docs: Array<{ id: string; title: string; type: string; viewedAt: string }> = raw
      ? JSON.parse(raw)
      : [];
    const filtered = docs.filter((d) => d.id !== id);
    filtered.unshift({ id, title, type, viewedAt: new Date().toISOString() });
    localStorage.setItem(LS_KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch {
    // localStorage unavailable
  }
}

export default function DocumentViewerPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/client/documents", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d.ok && Array.isArray(d.documents)) {
          const match = d.documents.find((doc: any) => doc.id === documentId);
          if (match) {
            setDoc(match);
            const label = match.filename || TYPE_LABELS[match.type] || match.type;
            recordRecentDoc(match.id, label, TYPE_LABELS[match.type] || match.type);
          } else {
            setError("Document not found");
          }
        } else {
          setError(d.error || "Failed to load");
        }
      })
      .catch(() => {
        if (mounted) setError("Failed to load document");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [documentId]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-[var(--muted)]" />
          <div className="h-48 rounded-xl bg-[var(--muted)]" />
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">{error || "Document not found"}</p>
            <Link href="/client/documents" className="mt-4 inline-block text-sm font-semibold hover:underline">
              Back to Documents
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const label = doc.filename || TYPE_LABELS[doc.type] || doc.type;
  const isPdf = doc.mimeType === "application/pdf";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-[var(--foreground)]">{label}</h1>
        <Link href="/client/documents" className="text-sm font-semibold text-[var(--foreground)] hover:underline">
          Back
        </Link>
      </div>

      {/* Document details card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{label}</span>
            <Badge>{TYPE_LABELS[doc.type] || doc.type}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metadata */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="text-xs text-[var(--muted-foreground)]">Date</span>
              <div className="text-sm font-semibold text-[var(--foreground)]">
                {formatDate(doc.createdAt)}
              </div>
            </div>
            <div>
              <span className="text-xs text-[var(--muted-foreground)]">Size</span>
              <div className="text-sm font-semibold text-[var(--foreground)]">
                {formatBytes(doc.sizeBytes)}
              </div>
            </div>
          </div>

          {/* PDF Preview */}
          {isPdf && (
            <div className="overflow-hidden rounded-xl border border-[var(--border)]">
              <iframe
                src={doc.downloadUrl}
                title={label}
                className="h-[500px] w-full"
              />
            </div>
          )}

          {/* Download button */}
          <div className="pt-2">
            <a href={doc.downloadUrl} target="_blank" rel="noreferrer">
              <Button type="button" className="w-full sm:w-auto">
                Download {isPdf ? "PDF" : "Document"}
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
