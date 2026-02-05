"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/useToast";
import { CheckCircle, XCircle, Clock, Receipt, RefreshCcw, AlertTriangle, Download } from "lucide-react";

type ApprovalItem = {
  id: string;
  type: "timesheet" | "expense";
  label: string;
  sublabel: string;
  status: string;
  date: string;
  amount?: string;
};

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "timesheets", label: "Timesheets" },
  { key: "expenses", label: "Expenses" },
] as const;

export default function OfficeApprovalsPage() {
  const loadedRef = useRef(false);
  const { toast } = useToast();
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [counts, setCounts] = useState({ timesheets: 0, expenses: 0, total: 0 });

  const load = useCallback(async (f?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = f && f !== "all" ? `?filter=${f}` : "";
      const res = await fetch(`/api/admin/office/approvals${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Failed to load");
      setItems(json.items || []);
      setCounts(json.counts || { timesheets: 0, expenses: 0, total: 0 });
      setSelected(new Set());
    } catch (e: any) {
      setError(e.message || "Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
    }
    load(filter);
  }, [load, filter]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  }

  async function bulkAction(action: "approve" | "reject") {
    if (selected.size === 0) return;
    setBulkBusy(true);
    try {
      const ids = items
        .filter((i) => selected.has(i.id))
        .map((i) => ({ id: i.id, type: i.type }));

      const res = await fetch("/api/admin/office/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Action failed");

      const categoryFails = json.failedItems?.filter((f: any) => f.reason === "missing_category")?.length || 0;
      const failMsg = json.failed
        ? categoryFails > 0
          ? `, ${categoryFails} expense(s) need a category before approval`
          : `, ${json.failed} failed`
        : "";
      toast({
        title: action === "approve" ? "Approved" : "Rejected",
        description: `${json.approved || json.rejected || 0} items ${action === "approve" ? "approved" : "rejected"}${failMsg}`,
        variant: json.failed ? "destructive" : "success",
      });
      load(filter);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <AppShell role="office" title="Approvals Inbox" subtitle="Review and approve timesheets and expenses">
      <div className="space-y-6">
        {/* Filter + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-1.5">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                }`}
              >
                {tab.label}
                {tab.key === "timesheets" && counts.timesheets > 0 && ` (${counts.timesheets})`}
                {tab.key === "expenses" && counts.expenses > 0 && ` (${counts.expenses})`}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selected.size > 0 && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => bulkAction("approve")}
                  disabled={bulkBusy}
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  {bulkBusy ? "Processing..." : `Approve (${selected.size})`}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => bulkAction("reject")}
                  disabled={bulkBusy}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Reject
                </Button>
              </>
            )}
            <a href="/api/admin/office/payroll-export" download>
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-1.5" />
                Payroll CSV
              </Button>
            </a>
            <a href="/api/admin/office/expenses-export" download>
              <Button variant="secondary" size="sm">
                <Download className="w-4 h-4 mr-1.5" />
                Expenses CSV
              </Button>
            </a>
            <Button variant="secondary" size="sm" onClick={() => load(filter)} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-[var(--foreground)]">{counts.total}</div>
                <div className="text-xs text-[var(--muted-foreground)]">Total Pending</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <div className="text-2xl font-bold text-[var(--foreground)]">{counts.timesheets}</div>
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">Timesheets</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-blue-500" />
                  <div className="text-2xl font-bold text-[var(--foreground)]">{counts.expenses}</div>
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">Expenses</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pending Items</CardTitle>
              {items.length > 0 && (
                <button
                  onClick={toggleSelectAll}
                  className="text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  {selected.size === items.length ? "Deselect all" : "Select all"}
                </button>
              )}
            </div>
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
                <Button variant="secondary" size="sm" onClick={() => load(filter)} className="mt-4">
                  Try Again
                </Button>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={CheckCircle}
                title="All clear"
                description="No pending approvals. Nice work!"
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 py-3 px-2 rounded transition-colors ${
                      selected.has(item.id) ? "bg-[var(--primary)]/5" : "hover:bg-[var(--muted)]/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded border-[var(--border)] accent-[var(--primary)]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant={item.type === "timesheet" ? "warning" : "secondary"} className="text-[10px]">
                          {item.type === "timesheet" ? "Timesheet" : "Expense"}
                        </Badge>
                        <span className="font-medium text-sm text-[var(--foreground)] truncate">{item.label}</span>
                      </div>
                      <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{item.sublabel}</div>
                    </div>
                    {item.amount && (
                      <span className="text-sm font-medium text-[var(--foreground)] shrink-0">{item.amount}</span>
                    )}
                    <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                      {new Date(item.date).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
