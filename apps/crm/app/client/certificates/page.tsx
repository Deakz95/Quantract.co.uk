"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Certificate = {
  id: string;
  type: "EIC" | "EICR" | "MWC";
  status: "draft" | "completed" | "issued" | "void";
  issuedAtISO?: string;
};

export default function ClientCertificatesPage() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/client/certificates", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setItems(Array.isArray(d.certificates) ? d.certificates : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Certificates</CardTitle>
            <Link href="/client" className="text-sm font-semibold text-[var(--foreground)] hover:underline">
              Back
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-[var(--muted-foreground)]">No certificates found.</div>
          ) : (
            <div className="space-y-2">
              {items.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-[var(--foreground)]">{c.type}</div>
                      <Badge>{c.status}</Badge>
                    </div>
                    {c.issuedAtISO ? (
                      <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">Issued {new Date(c.issuedAtISO).toLocaleString("en-GB")}</div>
                    ) : null}
                  </div>
                  <Link href={`/client/certificates/${c.id}`}>
                    <Button type="button" variant="secondary">View</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
