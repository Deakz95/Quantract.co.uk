"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { calcTotals } from "@/lib/calcTotals";

export type LineItem = {
  description: string;
  qty: number;
  unitPrice: number;
};

export function computeSubtotal(items: LineItem[]): number {
  return (items || []).reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.unitPrice || 0), 0);
}

function fmtGBP(n: number) {
  return `£${Number(n || 0).toFixed(2)}`;
}

const DESCRIPTION_PRESETS = [
  "Supply of",
  "Provision of",
  "Materials Only",
  "Supply and Installation of",
  "Provision and Fitting of",
  "Supply, Delivery, and Installation of",
  "All materials, labour, and equipment required to complete the project",
];

export default function LineItemsEditor(props: {
  items: LineItem[];
  setItems: (next: LineItem[]) => void;
  disabled?: boolean;
  showTotals?: boolean;
  vatRate?: number;
}) {
  const items = props.items || [];
  const disabled = !!props.disabled;
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);

  function setItem(i: number, patch: Partial<LineItem>) {
    props.setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function addItem() {
    props.setItems([...(items || []), { description: "", qty: 1, unitPrice: 0 }]);
  }

  function removeItem(i: number) {
    if ((items || []).length <= 1) return;
    props.setItems(items.filter((_, idx) => idx !== i));
  }

  function applyPreset(i: number, preset: string) {
    const currentDesc = items[i]?.description || "";
    // PREPEND preset to existing description (don't wipe it)
    const newDesc = currentDesc ? `${preset} ${currentDesc}` : preset;
    setItem(i, { description: newDesc });
    setOpenDropdown(null);
  }

  const vatRate = props.vatRate ?? 0.2;
  const totals = calcTotals(items, vatRate);
  const subtotal = totals.subtotal;

  return (
    <div className="grid gap-4">
      {items.map((it, i) => (
        <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          {/* Row 1: Preset dropdown + Description text area */}
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--muted-foreground)] w-20">Prefix</span>
              <div className="relative flex-1">
                <button
                  type="button"
                  className="w-full h-10 px-3 text-left text-sm bg-[var(--muted)] hover:bg-[var(--muted)]/80 border border-[var(--border)] rounded-xl flex items-center justify-between text-[var(--foreground)]"
                  onClick={() => setOpenDropdown(openDropdown === i ? null : i)}
                  disabled={disabled}
                >
                  <span className="text-[var(--muted-foreground)]">Select quick phrase...</span>
                  <span className="text-[var(--muted-foreground)]">▼</span>
                </button>
                {openDropdown === i && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg z-20 max-h-60 overflow-auto">
                    {DESCRIPTION_PRESETS.map((preset, pi) => (
                      <button
                        key={pi}
                        type="button"
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--primary)]/10 border-b border-[var(--border)] last:border-0"
                        onClick={() => applyPreset(i, preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-[var(--muted-foreground)] w-20 pt-2">Description</span>
              <textarea
                className="flex-1 min-h-[80px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] resize-y placeholder:text-[var(--muted-foreground)]"
                value={it.description}
                onChange={(e) => setItem(i, { description: e.target.value })}
                placeholder="Enter full description of work..."
                disabled={disabled}
              />
            </div>
          </div>

          {/* Row 2: Qty, Unit Price, Line Total, Remove */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Qty</span>
              <input
                type="number"
                className="w-20 h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-center text-[var(--foreground)]"
                value={it.qty || ""}
                onChange={(e) => setItem(i, { qty: e.target.value === "" ? 0 : Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                min={0}
                step={1}
                placeholder="0"
                disabled={disabled}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Unit £</span>
              <input
                type="number"
                className="w-28 h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
                value={it.unitPrice || ""}
                onChange={(e) => setItem(i, { unitPrice: e.target.value === "" ? 0 : Number(e.target.value) })}
                onFocus={(e) => e.target.select()}
                min={0}
                step={0.01}
                placeholder="0.00"
                disabled={disabled}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--muted-foreground)]">Line</span>
              <span className="text-sm font-bold text-[var(--foreground)] min-w-[80px]">
                {fmtGBP(Number(it.qty || 0) * Number(it.unitPrice || 0))}
              </span>
            </div>

            <div className="ml-auto">
              <Button
                type="button"
                variant="ghost"
                onClick={() => removeItem(i)}
                disabled={disabled || items.length === 1}
                className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          No line items. Click "Add item" to start.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button type="button" variant="secondary" onClick={addItem} disabled={disabled}>
          Add item
        </Button>
        {props.showTotals && (
          <div className="text-sm text-[var(--muted-foreground)] text-right space-y-1">
            <div>Subtotal (ex VAT): <span className="font-bold text-[var(--foreground)]">{fmtGBP(subtotal)}</span></div>
            <div>VAT ({Math.round(vatRate * 100)}%): <span className="font-bold text-[var(--foreground)]">{fmtGBP(totals.vat)}</span></div>
            <div>Total (inc VAT): <span className="font-bold text-[var(--foreground)] text-base">{fmtGBP(totals.total)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
