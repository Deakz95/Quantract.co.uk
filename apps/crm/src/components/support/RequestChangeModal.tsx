// src/components/support/RequestChangeModal.tsx
"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";

export default function RequestChangeModal({
  open,
  onClose,
  quoteId,
}: {
  open: boolean;
  onClose: () => void;
  quoteId: string;
}) {
  const [message, setMessage] = useState("");

  const mailto = useMemo(() => {
    const to = "support@quantract.co.uk";
    const subject = encodeURIComponent(`Change request for quote ${quoteId}`);
    const body = encodeURIComponent(
      `Hi Quantract,

Please can we request a change to quote ${quoteId}?

Details:
${message || "(add details here)"}

Thanks`
    );
    return `mailto:${to}?subject=${subject}&body=${body}`;
  }, [quoteId, message]);

  return (
    <Dialog open={open} onOpenChange={(open: boolean) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>Request a change</DialogTitle>
            <Button variant="ghost" type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-[var(--muted-foreground)]">No worries — tell us what you’d like changed and we’ll sort it.</p>

          <div className="mt-4">
            <label className="text-xs font-semibold text-[var(--foreground)]">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="e.g. Can we change the deposit to 20% and move the start date to next Monday?"
              className="mt-1 w-full resize-none rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
            />
            <p className="mt-2 text-xs text-[var(--muted-foreground)]">This opens your email app with a pre-filled message.</p>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <a href={mailto} className="inline-flex">
              <Button type="button">Open email</Button>
            </a>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
