"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingTable } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/components/ui/useToast";
import { CheckCircle, RefreshCw } from "lucide-react";

type ReviewQueueItem = {
  id: string;
  certificateNumber?: string;
  type: string;
  status: string;
  inspectorName?: string;
  inspectorEmail?: string;
  clientName?: string;
  siteAddress?: string;
  jobNumber?: string;
  submittedBy?: string;
  submittedAtISO?: string;
  updatedAt?: string;
};

export default function CertificateReviewQueueClient() {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/certificates/review", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load review queue");
      setItems(json.certificates || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load review queue";
      setError(message);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      load();
    }
  }, []);

  if (loading) {
    return <LoadingTable />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-[var(--muted-foreground)]">
          {error}
          <div className="mt-2">
            <Button variant="secondary" size="sm" onClick={load}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="No certificates pending review"
        description="All submitted certificates have been reviewed. Check back later."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted-foreground)]">
          {items.length} certificate{items.length !== 1 ? "s" : ""} pending review
        </p>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                <th className="px-4 py-3">Certificate</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Engineer</th>
                <th className="px-4 py-3">Client / Address</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {item.certificateNumber || item.id.slice(0, 8)}
                    {item.jobNumber && (
                      <div className="text-xs text-[var(--muted-foreground)]">Job {item.jobNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{item.type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div>{item.inspectorName || item.submittedBy || "—"}</div>
                    {item.inspectorEmail && (
                      <div className="text-xs text-[var(--muted-foreground)]">{item.inspectorEmail}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>{item.clientName || "—"}</div>
                    {item.siteAddress && (
                      <div className="text-xs text-[var(--muted-foreground)]">{item.siteAddress}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                    {item.submittedAtISO
                      ? new Date(item.submittedAtISO).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/certificates/${item.id}`}>
                      <Button variant="secondary" size="sm">
                        Review
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
