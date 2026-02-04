'use client';

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusBadgeProps } from "@/lib/statusConfig";
import { Receipt, ArrowUpRight, FileText, Clock, Briefcase, CheckCircle2, Tag } from "lucide-react";

const EXPENSE_CATEGORIES = [
  { value: "", label: "Uncategorised" },
  { value: "materials", label: "Materials" },
  { value: "tools", label: "Tools & Equipment" },
  { value: "travel", label: "Travel" },
  { value: "fuel", label: "Fuel" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "office", label: "Office" },
  { value: "insurance", label: "Insurance" },
  { value: "training", label: "Training" },
  { value: "other", label: "Other" },
];

type ArrowUpRightResult = { storageKey: string; filename: string; mimeType?: string; sizeBytes?: number };

export default function ExpensesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setArrowUpRighting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const res = await fetch("/api/admin/expenses");
    const json = await res.json();
    setItems(json.data || []);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function uploadAndCreate() {
    if (!file) return;
    setArrowUpRighting(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const up = await fetch("/api/admin/expenses/upload", { method: "POST", body: form });
      const upJson = await up.json();
      const att: ArrowUpRightResult = upJson.data;

      await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachment: {
            filename: att.filename,
            mimeType: att.mimeType,
            sizeBytes: att.sizeBytes,
            storageKey: att.storageKey
          }
        })
      });

      setFile(null);
      await refresh();
    } finally {
      setArrowUpRighting(false);
    }
  }

  async function parse(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/expenses/${id}/parse`, { method: "POST" });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function confirm(id: string, patch: any) {
    setBusyId(id);
    try {
      await fetch(`/api/admin/expenses/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell role="admin" title="Expenses" subtitle="Track and manage business expenses">
      <div className="space-y-6">
        {/* ArrowUpRight Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>ArrowUpRight Receipt</CardTitle>
                <p className="text-sm text-[var(--muted-foreground)]">ArrowUpRight → OCR Parse → Review & Confirm</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label className="flex-1">
                <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center hover:border-[var(--primary)] transition-colors cursor-pointer">
                  <Receipt className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2" />
                  <p className="text-sm text-[var(--foreground)] font-medium">
                    {file ? file.name : 'Click to select a receipt'}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">PDF, PNG, or JPG</p>
                </div>
                <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <Button
                variant="gradient"
                onClick={uploadAndCreate}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    ArrowUpRighting...
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    ArrowUpRight
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading expenses...
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No expenses yet</h3>
              <p className="text-[var(--muted-foreground)]">ArrowUpRight your first receipt to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {items.map((e) => (
              <ExpenseCard
                key={e.id}
                e={e}
                busy={busyId === e.id}
                onParse={() => parse(e.id)}
                onConfirm={(patch) => confirm(e.id, patch)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function ExpenseCard({
  e,
  busy,
  onParse,
  onConfirm
}: {
  e: any;
  busy: boolean;
  onParse: () => void;
  onConfirm: (patch: any) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [supplierName, setSupplierName] = useState(e.supplierName ?? "");
  const [total, setTotal] = useState(e.total ?? "");
  const [vat, setVat] = useState(e.vat ?? "");
  const [subtotal, setSubtotal] = useState(e.subtotal ?? "");
  const [receiptDate, setReceiptDate] = useState(e.receiptDate ? new Date(e.receiptDate).toISOString().slice(0, 10) : "");
  const [category, setCategory] = useState(e.category ?? "");

  useEffect(() => {
    setSupplierName(e.supplierName ?? "");
    setTotal(e.total ?? "");
    setVat(e.vat ?? "");
    setSubtotal(e.subtotal ?? "");
    setReceiptDate(e.receiptDate ? new Date(e.receiptDate).toISOString().slice(0, 10) : "");
    setCategory(e.category ?? "");
  }, [e.id, e.updatedAt]);

  const getStatusBadge = (status: string) => {
    const { label, variant } = getStatusBadgeProps("expense", status);
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--muted)] flex items-center justify-center">
              <FileText className="w-6 h-6 text-[var(--muted-foreground)]" />
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">{e.attachment?.filename ?? "Receipt"}</p>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(e.status)}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onParse} disabled={busy}>
              {busy ? "Working..." : "Parse OCR"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setEdit((v) => !v)}>
              {edit ? "Close" : "Review"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[var(--muted-foreground)]" />
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Supplier</p>
              <p className="text-sm font-medium text-[var(--foreground)]">{e.supplierName ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--muted-foreground)]" />
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Date</p>
              <p className="text-sm font-medium text-[var(--foreground)]">{e.receiptDate ? new Date(e.receiptDate).toLocaleDateString() : "—"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Total</p>
            <p className="text-sm font-semibold text-[var(--foreground)]">£{((e.total ?? 0) / 100).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">VAT</p>
            <p className="text-sm font-medium text-[var(--foreground)]">£{((e.vat ?? 0) / 100).toFixed(2)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-[var(--muted-foreground)]" />
            <div>
              <p className="text-xs text-[var(--muted-foreground)]">Category</p>
              <p className="text-sm font-medium text-[var(--foreground)]">{EXPENSE_CATEGORIES.find(c => c.value === (e.category ?? ""))?.label ?? "Uncategorised"}</p>
            </div>
          </div>
        </div>

        {edit && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-4">
            <p className="font-medium text-[var(--foreground)]">Review & Confirm</p>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">Supplier</label>
                <input className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--card)]" value={supplierName} onChange={(ev) => setSupplierName(ev.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">Date</label>
                <input className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--card)]" type="date" value={receiptDate} onChange={(ev) => setReceiptDate(ev.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">Category</label>
                <select className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--card)]" value={category} onChange={(ev) => setCategory(ev.target.value)}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">Subtotal (pence)</label>
                <input className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--card)]" value={subtotal} onChange={(ev) => setSubtotal(ev.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">VAT (pence)</label>
                <input className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--card)]" value={vat} onChange={(ev) => setVat(ev.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[var(--muted-foreground)]">Total (pence)</label>
                <input className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--card)]" value={total} onChange={(ev) => setTotal(ev.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted-foreground)]">
                Human confirmation is required before posting into job costing.
              </p>
              <Button
                variant="gradient"
                disabled={busy}
                onClick={() => onConfirm({
                  supplierName,
                  receiptDate,
                  category: category || null,
                  subtotal: subtotal === "" ? null : Number(subtotal),
                  vat: vat === "" ? null : Number(vat),
                  total: total === "" ? null : Number(total)
                })}
              >
                {busy ? "Saving..." : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
