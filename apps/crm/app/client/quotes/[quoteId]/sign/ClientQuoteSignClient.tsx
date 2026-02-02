// app/client/quotes/[quoteId]/sign/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import SignaturePad from "@/components/sign/SignaturePad";
import { upsertSigningRecord } from "@/lib/signingStore";
import { HelpCircle } from "lucide-react";
import { useToast } from "@/components/ui/useToast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";

type Props = {
  quoteId: string;
};

export default function ClientSignQuote({ quoteId }: Props) {
  const { toast } = useToast();

  const [typedName, setTypedName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    const hasSig = !!signatureDataUrl || typedName.trim().length >= 2;
    return agreed && hasSig && !busy && !!quoteId;
  }, [agreed, signatureDataUrl, typedName, busy, quoteId]);

  async function submit() {
    if (!quoteId) return;
    setBusy(true);
    try {
      const signerName = typedName.trim() || "(Signature Provided)";
      upsertSigningRecord({
        quoteId,
        signedAtISO: new Date().toISOString(),
        signerName,
        signatureDataUrl: signatureDataUrl ?? undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        ip: "",
      });

      toast({ title: "Signed", description: "Quote signed (demo). Redirecting to certificate…" });
      window.location.href = `/client/quotes/${quoteId}/certificate`;
    } finally {
      setBusy(false);
    }
  }

  if (!quoteId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading…</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-[var(--muted-foreground)]">Preparing signing…</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Accept & Sign</CardTitle>
            <Badge>Quote</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-[var(--muted-foreground)]">Please review the quote and sign below to authorise us to proceed.</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" type="button">
              View quote PDF
            </Button>
            <Button variant="secondary" type="button">
              View terms & conditions
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} />

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="text-xs font-semibold text-[var(--foreground)]">Typed name (fallback)</div>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">If you can’t draw a signature, type your full name to sign.</p>
                <input
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="mt-3 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
                />
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--border)]"
                />
                <span className="text-sm text-[var(--muted-foreground)]">I confirm I have read and accept the quote and the Terms & Conditions.</span>
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Link href={`/client/quotes/${quoteId}`}>
                  <Button variant="secondary" type="button">
                    Cancel
                  </Button>
                </Link>
                <Button type="button" disabled={!canSubmit} onClick={submit}>
                  {busy ? "Submitting…" : "Accept & Sign"}
                </Button>
              </div>

              <p className="text-xs text-[var(--muted-foreground)]">We store a signing record (timestamp + document hash) for audit purposes.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signature rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-[var(--muted-foreground)]">
              <div>• Draw your signature, or type your full name.</div>
              <div>• You must tick acceptance before signing.</div>
              <div className="flex items-start gap-2">
                <span>• Once signed, the quote details are locked so everyone is working from the same agreed version.</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]">
                        <HelpCircle className="h-4 w-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      This prevents accidental changes after you’ve signed. If something needs updating, you can request a change and we’ll re-issue the documents.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
