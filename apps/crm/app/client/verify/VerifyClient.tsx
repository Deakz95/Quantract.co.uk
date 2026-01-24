// app/client/verify/VerifyClient.tsx
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function VerifyClient() {
  const sp = useSearchParams();

  const data = useMemo(() => {
    const quoteId = sp.get("quoteId") || sp.get("q") || "";
    const hash = sp.get("hash") || sp.get("h") || "";
    const signedAt = sp.get("signedAt") || sp.get("t") || "";
    return { quoteId, hash, signedAt };
  }, [sp]);

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Verify Signing</CardTitle>
            <Badge>Demo</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-700">
            This page verifies a signing certificate link (demo).
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div>
              Quote ID: <span className="font-semibold text-slate-900">{data.quoteId || "(missing)"}</span>
            </div>
            <div className="break-all">
              Hash: <span className="font-mono text-slate-900">{data.hash || "(missing)"}</span>
            </div>
            <div>
              Signed at: <span className="font-semibold text-slate-900">{data.signedAt || "(missing)"}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {data.quoteId ? (
              <Link href={`/client/quotes/${data.quoteId}/certificate`}>
                <Button>View certificate</Button>
              </Link>
            ) : null}
            <Link href="/client">
              <Button variant="secondary">Back</Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            In production, this would call the backend to validate the hash against immutable stored records.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
