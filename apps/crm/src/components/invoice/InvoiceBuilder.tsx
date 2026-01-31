// src/components/invoice/InvoiceBuilder.tsx
"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/ui/useToast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clampMoney } from "@/lib/invoiceMath";
import {
  ensureNextStageInvoice,
  getInvoice,
  upsertInvoice,
  type InvoiceRecord,
  type InvoiceStatus,
} from "@/lib/invoiceStore";
import { getQuoteSettings } from "@/lib/quoteStore";

function formatGBP(n: number) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
  } catch {
    return `£${n.toFixed(2)}`;
  }
}

// Step 4: map enum → human label
const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  unpaid: "Unpaid",
  paid: "Paid",
};

export default function InvoiceBuilder({ invoiceId }: { invoiceId: string }) {
  const { toast } = useToast();

  const existing: InvoiceRecord | null = useMemo(() => {
    const found = getInvoice(invoiceId) as InvoiceRecord | null | undefined;
    return found && typeof found.id === "string" ? found : null;
  }, [invoiceId]);

  const [inv, setInv] = useState<InvoiceRecord | null>(existing);

  if (!inv) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice not found</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-[var(--muted-foreground)]">This invoice doesn’t exist in the demo store yet.</div>
        </CardContent>
      </Card>
    );
  }

  const invoice: InvoiceRecord = inv;

  // Step 5: explicit business logic helpers
  const isPaid = invoice.status === "paid";
  const isPayable = invoice.status === "sent" || invoice.status === "unpaid";

  function setStatus(status: InvoiceStatus) {
    const next: InvoiceRecord = { ...invoice, status };
    setInv(next);
    upsertInvoice(next);

    // When moving to paid, you might trigger next-stage invoice creation.
    if (status === "paid" && next.quoteId) {
      const settings = getQuoteSettings(next.quoteId);
      const quoteTotal = Number(settings.quoteTotal || 0);

      // NOTE: currently VAT is stored as a money amount on the invoice, so this just checks "VAT applied".
      // In Phase B we can store vatRate explicitly.
      const vatRate = next.vat > 0 ? 0.2 : 0;

      if (quoteTotal > 0 && (vatRate >= 0 || vatRate === 0)) {
        ensureNextStageInvoice(next.quoteId);
      }
    }
  }

  function setMoney(field: "subtotal" | "vat" | "total", value: number) {
    const next: InvoiceRecord = { ...invoice, [field]: clampMoney(value) } as InvoiceRecord;

    if (field === "subtotal" || field === "vat") {
      next.total = clampMoney(next.subtotal + next.vat);
    }

    setInv(next);
    upsertInvoice(next);
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Invoice Builder</CardTitle>
            <div className="flex items-center gap-2">
              {inv.kind ? <Badge>{inv.kind}</Badge> : null}
              <Badge>{INVOICE_STATUS_LABEL[inv.status]}</Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="text-sm text-[var(--muted-foreground)]">
            Invoice: <span className="font-semibold text-[var(--foreground)]">{(inv as any).invoiceNumber || "Draft"}</span>
          </div>
          {inv.quoteId ? <div className="mt-1 text-xs text-[var(--muted-foreground)]">Linked quote: {(inv as any).quoteNumber || "View"}</div> : null}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-[var(--foreground)]">Subtotal</label>
              <input
                inputMode="decimal"
                value={String(inv.subtotal)}
                onChange={(e) => setMoney("subtotal", Number(e.target.value || 0))}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground)]">VAT</label>
              <input
                inputMode="decimal"
                value={String(inv.vat)}
                onChange={(e) => setMoney("vat", Number(e.target.value || 0))}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm shadow-sm focus:border-[var(--border)] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--foreground)]">Total</label>
              <div className="mt-1 rounded-2xl border border-[var(--border)] bg-[var(--muted)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)]">
                {formatGBP(inv.total)}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={() => setStatus("draft")} disabled={inv.status === "draft"}>
              Draft
            </Button>

            <Button
              variant="secondary"
              type="button"
              onClick={() => setStatus("sent")}
              disabled={inv.status === "sent"}
            >
              Mark sent
            </Button>

            <Button
              variant="secondary"
              type="button"
              onClick={() => setStatus("unpaid")}
              disabled={inv.status === "unpaid"}
            >
              Mark unpaid
            </Button>

            <Button
              variant="secondary"
              type="button"
              onClick={() => setStatus("paid")}
              disabled={isPaid}
            >
              Mark paid
            </Button>

            <Button
              variant="secondary"
              type="button"
              onClick={() => toast({ title: "Download", description: "PDF download (demo)." })}
            >
              Download PDF
            </Button>
          </div>

          <p className="mt-4 text-xs text-[var(--muted-foreground)]">
            Demo builder: in production, this will render the invoice template PDF + allow line-level edits.
            {isPayable ? " (Invoice is payable.)" : isPaid ? " (Invoice is paid.)" : ""}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
