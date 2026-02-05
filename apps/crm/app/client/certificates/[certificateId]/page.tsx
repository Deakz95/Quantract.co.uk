"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type CertificateDetail = {
  id: string;
  type: string;
  status: string;
  certificateNumber?: string;
  issuedAtISO?: string;
  outcome?: string;
  observations?: string;
};

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

function recordRecentDoc(id: string, title: string) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const docs: Array<{ id: string; title: string; type: string; viewedAt: string }> = raw
      ? JSON.parse(raw)
      : [];
    const filtered = docs.filter((d) => d.id !== id);
    filtered.unshift({ id, title, type: "Certificate", viewedAt: new Date().toISOString() });
    localStorage.setItem(LS_KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch {
    // localStorage unavailable
  }
}

export default function CertificateViewerPage() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const [cert, setCert] = useState<CertificateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/client/certificates", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        if (d.ok && Array.isArray(d.certificates)) {
          const match = d.certificates.find(
            (c: any) => c.id === certificateId
          );
          if (match) {
            setCert(match);
            recordRecentDoc(match.id, `${match.type} Certificate`);
          } else {
            setError("Certificate not found");
          }
        } else {
          setError(d.error || "Failed to load");
        }
      })
      .catch(() => {
        if (mounted) setError("Failed to load certificate");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [certificateId]);

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

  if (error || !cert) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">{error || "Certificate not found"}</p>
            <Link href="/client/certificates" className="mt-4 inline-block text-sm font-semibold hover:underline">
              Back to Certificates
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold text-[var(--foreground)]">
          {cert.type} Certificate
        </h1>
        <Link href="/client/certificates" className="text-sm font-semibold text-[var(--foreground)] hover:underline">
          Back
        </Link>
      </div>

      {/* Certificate details card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>{cert.type}</span>
            <Badge variant={cert.status === "issued" ? "success" : "default"}>
              {cert.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metadata grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {cert.certificateNumber && (
              <div>
                <span className="text-xs text-[var(--muted-foreground)]">Certificate No.</span>
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  {cert.certificateNumber}
                </div>
              </div>
            )}
            {cert.issuedAtISO && (
              <div>
                <span className="text-xs text-[var(--muted-foreground)]">Issued</span>
                <div className="text-sm font-semibold text-[var(--foreground)]">
                  {formatDate(cert.issuedAtISO)}
                </div>
              </div>
            )}
            {cert.outcome && (
              <div>
                <span className="text-xs text-[var(--muted-foreground)]">Outcome</span>
                <div className="mt-0.5">
                  <Badge variant="success">{cert.outcome}</Badge>
                </div>
              </div>
            )}
          </div>

          {cert.observations && (
            <div>
              <span className="text-xs text-[var(--muted-foreground)]">Observations</span>
              <p className="mt-1 text-sm text-[var(--foreground)] whitespace-pre-wrap">
                {cert.observations}
              </p>
            </div>
          )}

          {/* Download button */}
          <div className="pt-2">
            <a
              href={`/api/client/certificates/${cert.id}/pdf`}
              target="_blank"
              rel="noreferrer"
            >
              <Button type="button" className="w-full sm:w-auto">
                Download Certificate PDF
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
