// src/components/quote/SendQuoteModal.tsx
"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/useToast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function buildMagicLink(quoteId: string) {
  const token = encodeURIComponent(`QUOTE_${quoteId}_demo`);
  const next = encodeURIComponent(`/client/quotes/${quoteId}/sign`);
  return `/client/verify?token=${token}&next=${next}`;
}

export default function SendQuoteModal({
  open,
  onClose,
  quoteId,
  clientEmail,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  quoteId: string;
  clientEmail: string;
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const link = useMemo(() => buildMagicLink(quoteId), [quoteId]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin + link);
      toast({ title: "Copied", description: "Magic link copied to clipboard.", variant: "success" });
    } catch {
      toast({ title: "Copy failed", description: "Select and copy the link manually.", variant: "destructive" });
    }
  }

  async function send() {
    setBusy(true);
    try {
      // TODO (backend):
      // 1) Render quote PDF
      // 2) Create a one-time token bound to quoteId + recipient
      // 3) Email: PDF attached + magic link that goes to /client/verify?token=...&next=/client/quotes/{id}/sign
      // POST /api/quotes/send { quoteId, email }

      // DEMO: pretend email sent
      await new Promise((r) => setTimeout(r, 650));
      setSent(true);
      onSent();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Send quote to client</CardTitle>
              <Button variant="ghost" type="button" onClick={onClose}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-900">Recipient</div>
                <div className="mt-1 text-sm text-slate-700">
                  {clientEmail?.trim() ? clientEmail : "(enter client email on the quote first)"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-slate-900">What gets sent</div>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  <li>• Quote PDF attachment</li>
                  <li>• Secure magic link to accept + sign</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-semibold text-slate-900">Magic link (demo)</div>
                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 break-all">
                  {typeof window !== "undefined" ? window.location.origin + link : link}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="secondary" type="button" onClick={copyLink}>
                    Copy link
                  </Button>
                  <a href={link} className="inline-flex">
                    <Button variant="secondary" type="button">Open link</Button>
                  </a>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button variant="secondary" type="button" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="button" disabled={busy || !clientEmail?.trim()} onClick={send}>
                  {busy ? "Sending…" : sent ? "Sent" : "Send email"}
                </Button>
              </div>

              <p className="text-xs text-slate-500">
                Production note: the token should be one-time, expire quickly, and bind to quote + recipient email.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
