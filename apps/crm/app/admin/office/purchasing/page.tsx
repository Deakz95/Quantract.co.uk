"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/useToast";
import { Receipt, RefreshCcw, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

type SupplierBill = {
  id: string;
  supplier: string;
  reference: string | null;
  billDate: string | null;
  status: string;
  subtotal: number;
  vat: number;
  total: number;
  job: { id: string; title: string | null; jobNumber: number | null } | null;
  supplierBillLines: Array<{
    id: string;
    description: string;
    quantity: number;
    unitCost: number;
    totalExVat: number;
  }>;
};

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "approved", label: "Approved" },
  { key: "paid", label: "Paid" },
] as const;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

export default function PurchasingPage() {
  const loadedRef = useRef(false);
  const { toast } = useToast();
  const [items, setItems] = useState<SupplierBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = status ? `?status=${status}` : "";
      const res = await fetch(`/api/admin/office/supplier-bills${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load");
      setItems(json.items || []);
    } catch (e: any) {
      setError(e.message || "Failed to load supplier bills");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) loadedRef.current = true;
    load(statusFilter);
  }, [load, statusFilter]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/office/supplier-bills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Update failed");
      toast({ title: "Updated", description: `Bill marked as ${status}`, variant: "success" });
      load(statusFilter);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  const draftCount = items.filter((b) => b.status === "draft").length;
  const approvedCount = items.filter((b) => b.status === "approved").length;
  const totalValue = items.reduce((sum, b) => sum + (b.total || 0), 0);

  return (
    <AppShell role="admin" title="Purchasing" subtitle="Supplier invoices and bills">
      <div className="space-y-6">
        {/* Filter + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === tab.key
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={() => load(statusFilter)} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-[var(--foreground)]">{draftCount}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Draft Bills</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-[var(--foreground)]">{approvedCount}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Approved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-[var(--foreground)]">{formatCurrency(totalValue)}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Total Value</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Bills</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
                    <LoadingSkeleton className="h-4 w-40" />
                    <LoadingSkeleton className="mt-2 h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                <p className="text-sm text-[var(--foreground)]">{error}</p>
                <Button variant="secondary" size="sm" onClick={() => load(statusFilter)} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No supplier bills"
                description={statusFilter ? `No ${statusFilter} bills found.` : "No supplier bills recorded yet."}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Supplier</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Reference</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-[var(--foreground)]">Job</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Total</th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-[var(--foreground)]">Status</th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-[var(--foreground)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((bill, index) => (
                      <tr
                        key={bill.id}
                        className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                          index % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]/50"
                        }`}
                      >
                        <td className="py-3 px-4 font-medium text-[var(--foreground)]">{bill.supplier}</td>
                        <td className="py-3 px-4 text-[var(--muted-foreground)]">{bill.reference || "—"}</td>
                        <td className="py-3 px-4">
                          {bill.job ? (
                            <Link href={`/admin/jobs/${bill.job.id}`} className="text-[var(--primary)] hover:underline text-xs">
                              {bill.job.jobNumber ? `#${bill.job.jobNumber}` : bill.job.title || "Job"}
                            </Link>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[var(--foreground)]">
                          {formatCurrency(bill.total)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={
                              bill.status === "draft" ? "secondary" :
                              bill.status === "approved" ? "warning" :
                              bill.status === "paid" ? "success" :
                              "default"
                            }
                          >
                            {bill.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {bill.status === "draft" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => updateStatus(bill.id, "approved")}
                                disabled={busyId === bill.id}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                            )}
                            {bill.status === "approved" && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => updateStatus(bill.id, "paid")}
                                disabled={busyId === bill.id}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
