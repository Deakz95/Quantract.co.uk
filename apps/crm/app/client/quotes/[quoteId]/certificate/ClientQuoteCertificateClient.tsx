// app/client/quotes/[quoteId]/certificate/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSigningRecord } from "@/lib/signingStore";
import { sha256Hex } from "@/lib/cryptoHash";
import DownloadPackModal from "@/components/docs/DownloadPackModal";

type Props = {
  quoteId: string;
};

export default function SigningCertificate({ quoteId }: Props) {
  const rec = useMemo(() => (quoteId ? getSigningRecord(quoteId) : null), [quoteId]);
  const [hash, setHash] = useState<string | null>(null);
  const [packOpen, setPackOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    if (!quoteId) return () => {
      alive = false;
    };

    (async () => {
      const base = rec ? `${rec.quoteId}|${rec.signedAtISO}|${rec.signerName}` : `${quoteId}|missing`;
      const h = await sha256Hex(base);
      if (alive) setHash(h);
    })();

    return () => {
      alive = false;
    };
  }, [quoteId, rec]);

  return (
    <div className="space-y-5">
      <DownloadPackModal open={packOpen} onClose={() => setPackOpen(false)} quoteId={quoteId} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Signing Certificate</CardTitle>
            <Badge>Quote {quoteId || "…"}</Badge>
          </div>
        </CardHeader>

        <CardContent>
          {!quoteId ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Loading…</div>
              <div className="mt-1 text-sm text-slate-700">Fetching quote id…</div>
            </div>
          ) : !rec ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">No signing record found</div>
              <div className="mt-1 text-sm text-slate-700">This quote may not be signed yet.</div>
              <div className="mt-3">
                <Link href={`/client/quotes/${quoteId}/sign`}>
                  <Button>Go to signing</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-900">Signer</div>
                  <div className="mt-1 text-sm text-slate-700">{rec.signerName}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold text-slate-900">Signed at</div>
                  <div className="mt-1 text-sm text-slate-700">{new Date(rec.signedAtISO).toLocaleString()}</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2">
                  <div className="text-xs font-semibold text-slate-900">Document hash (demo)</div>
                  <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 break-all">
                    {hash ?? "…"}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    In production, generate this on the server from the exact PDF bytes + store immutably.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-slate-900">Signature image</div>
                {rec.signatureDataUrl ? (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt="Signature" src={rec.signatureDataUrl} className="max-h-28" />
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-700">Typed signature used</div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-slate-900">Technical</div>
                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs text-slate-600">User agent</div>
                    <div className="mt-1 text-xs text-slate-900 break-all">{rec.userAgent || "(not captured)"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-600">IP address</div>
                    <div className="mt-1 text-xs text-slate-900">{rec.ip || "(server will set)"}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`/client/quotes/${quoteId}`}>
                  <Button variant="secondary">Back to quote</Button>
                </Link>
                <Button type="button" onClick={() => setPackOpen(true)}>
                  Download signed pack
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
