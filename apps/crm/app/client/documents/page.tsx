// app/client/documents/page.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllSigningRecords } from "@/lib/signingStore";
import { useToast } from "@/components/ui/useToast";

export default function ClientDocuments() {
  const { toast } = useToast();
  const recs = useMemo(() => getAllSigningRecords(), []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {recs.length === 0 ? (
          <div className="text-sm text-slate-700">No signed documents yet.</div>
        ) : (
          <div className="space-y-3">
            {recs.map((r) => (
              <div
                key={r.quoteId}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">Signed Quote</div>
                  <div className="mt-0.5 text-xs text-slate-600">
                    {r.quoteId} • {new Date(r.signedAtISO).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>Signed</Badge>
                  <Link href={`/client/quotes/${r.quoteId}/certificate`}>
                    <Button variant="secondary">Certificate</Button>
                  </Link>
                  <Button
                    type="button"
                    onClick={() => toast({ title: "Download", description: "Download (demo)." })}
                  >
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
