'use client';

import { AppShell } from "@/components/AppShell";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/Input";
import { DialogContent } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArrowLeft, Plus, Printer, X, QrCode, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type QrTag = {
  id: string;
  code: string;
  label: string | null;
  status: string;
  createdAt: string;
  assignment: {
    id: string;
    certificateId: string | null;
    documentId: string | null;
    assignedAt: string;
    note: string | null;
    certificate: { id: string; certificateNumber: string | null; type: string } | null;
    document: { id: string; originalFilename: string | null } | null;
    assignedBy: { id: string; name: string | null; email: string } | null;
  } | null;
};

type QrOrder = {
  id: string;
  qty: number;
  status: string;
  amountPence: number;
  createdAt: string;
  fulfilledAt: string | null;
};

const PACK_OPTIONS = [
  { qty: 25, label: "25 Tags" },
  { qty: 50, label: "50 Tags" },
  { qty: 100, label: "100 Tags" },
];

export default function QrTagsPage() {
  const searchParams = useSearchParams();
  const [tags, setTags] = useState<QrTag[]>([]);
  const [orders, setOrders] = useState<QrOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [generateCount, setGenerateCount] = useState("10");
  const [labelPrefix, setLabelPrefix] = useState("");
  const [generating, setGenerating] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPack, setSelectedPack] = useState(25);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Detect ?purchased=1 from Stripe redirect
  useEffect(() => {
    if (searchParams.get("purchased") === "1") {
      setPurchaseSuccess(true);
      // Clear the query param from URL without reloading
      window.history.replaceState({}, "", "/admin/qr-tags");
      // Auto-dismiss after 6s
      const t = setTimeout(() => setPurchaseSuccess(false), 6000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  const fetchTags = useCallback(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("limit", "100");
    fetch(`/api/admin/qr-tags?${params}`)
      .then((r) => r.json())
      .then((j) => {
        setTags(j.tags || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [statusFilter]);

  const fetchOrders = useCallback(() => {
    fetch("/api/admin/qr-tags/orders")
      .then((r) => r.json())
      .then((j) => setOrders(j.orders || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchTags();
    fetchOrders();
  }, [fetchTags, fetchOrders]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/qr-tags/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: Math.min(Math.max(parseInt(generateCount) || 1, 1), 100),
          labelPrefix: labelPrefix.trim() || undefined,
        }),
      });
      if (res.ok) {
        setShowGenerateModal(false);
        setGenerateCount("10");
        setLabelPrefix("");
        fetchTags();
      } else {
        alert("Failed to generate tags");
      }
    } catch {
      alert("Error generating tags");
    } finally {
      setGenerating(false);
    }
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const res = await fetch("/api/admin/qr-tags/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qty: selectedPack }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error === "stripe_not_configured" ? "Stripe is not configured. Please contact support." : "Failed to start checkout");
      }
    } catch {
      alert("Error starting checkout");
    } finally {
      setPurchasing(false);
    }
  };

  const handleRevoke = async (tagId: string) => {
    if (!confirm("Revoke this QR tag? It will no longer resolve when scanned.")) return;
    setRevokingId(tagId);
    try {
      const res = await fetch(`/api/admin/qr-tags/${tagId}/revoke`, { method: "POST" });
      if (res.ok) {
        fetchTags();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error === "already_revoked" ? "Tag is already revoked." : "Failed to revoke tag.");
      }
    } catch {
      alert("Error revoking tag.");
    } finally {
      setRevokingId(null);
    }
  };

  const counts = {
    total: tags.length,
    available: tags.filter((t) => t.status === "available").length,
    assigned: tags.filter((t) => t.status === "assigned").length,
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge variant="secondary">Available</Badge>;
      case "assigned":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Assigned</Badge>;
      case "revoked":
        return <Badge variant="destructive">Revoked</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const orderStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Paid</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatPence = (pence: number) => {
    return `\u00A3${(pence / 100).toFixed(2)}`;
  };

  return (
    <AppShell role="admin" title="QR Tags" subtitle="Generate and manage QR tags for certificates">
      <div className="space-y-6">
        {/* Purchase Success Banner */}
        {purchaseSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 p-4 flex items-center justify-between">
            <div className="text-sm text-emerald-800 dark:text-emerald-200">
              Payment received! Your QR tags are being generated and will appear shortly. Refresh the page if they haven&apos;t appeared yet.
            </div>
            <Button variant="ghost" size="icon" onClick={() => setPurchaseSuccess(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/admin/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex gap-2">
            {tags.length > 0 && (
              <Link href="/admin/qr-tags/print">
                <Button variant="outline" size="sm">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Sheet
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowPurchaseModal(true)}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy QR Tags
            </Button>
            <Button size="sm" onClick={() => setShowGenerateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Generate Tags
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter("all")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)]">Total Tags</div>
                  <div className="text-3xl font-bold text-[var(--foreground)] mt-1">{counts.total}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter("available")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)]">Available</div>
                  <div className="text-3xl font-bold text-[var(--foreground)] mt-1">{counts.available}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center shadow-lg">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-all" onClick={() => setStatusFilter("assigned")}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--muted-foreground)]">Assigned</div>
                  <div className="text-3xl font-bold text-[var(--foreground)] mt-1">{counts.assigned}</div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-[var(--border)]">
          {(["all", "available", "assigned", "revoked"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${
                statusFilter === s
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {s === "all" ? `All (${counts.total})` : s}
            </button>
          ))}
        </div>

        {/* Tags Table */}
        <Card>
          <CardHeader>
            <CardTitle>QR Tags</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-[var(--muted-foreground)]">Loading QR tags...</div>
            ) : tags.length === 0 ? (
              <EmptyState
                icon={QrCode}
                title="No QR tags found"
                description="Generate your first batch of QR tags to get started."
                primaryAction={{ label: "Generate Tags", onClick: () => setShowGenerateModal(true) }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Code</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Label</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Assigned To</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Created</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.map((tag, index) => (
                      <tr
                        key={tag.id}
                        className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                          index % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]/50"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <code className="text-xs bg-[var(--muted)] px-2 py-1 rounded font-mono">
                            {tag.code.slice(0, 8)}...{tag.code.slice(-4)}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-[var(--foreground)]">{tag.label || "\u2014"}</span>
                        </td>
                        <td className="py-3 px-4 text-center">{statusBadge(tag.status)}</td>
                        <td className="py-3 px-4">
                          {tag.assignment ? (
                            <div className="text-sm">
                              {tag.assignment.certificate ? (
                                <span className="text-[var(--foreground)]">
                                  {tag.assignment.certificate.type} {tag.assignment.certificate.certificateNumber || ""}
                                </span>
                              ) : tag.assignment.document ? (
                                <span className="text-[var(--foreground)]">
                                  {tag.assignment.document.originalFilename || "Document"}
                                </span>
                              ) : (
                                <span className="text-[var(--muted-foreground)]">{"\u2014"}</span>
                              )}
                              {tag.assignment.assignedBy && (
                                <div className="text-xs text-[var(--muted-foreground)]">
                                  by {tag.assignment.assignedBy.name || tag.assignment.assignedBy.email}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-[var(--muted-foreground)]">{"\u2014"}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-[var(--muted-foreground)]">
                            {new Date(tag.createdAt).toLocaleDateString("en-GB")}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {tag.status === "assigned" && (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={revokingId === tag.id}
                              onClick={() => handleRevoke(tag.id)}
                            >
                              {revokingId === tag.id ? "Revoking..." : "Revoke"}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order History */}
        {orders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Date</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Qty</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Amount</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-[var(--foreground)]">Fulfilled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, index) => (
                      <tr
                        key={order.id}
                        className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                          index % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--muted)]/50"
                        }`}
                      >
                        <td className="py-3 px-4 text-sm text-[var(--foreground)]">
                          {new Date(order.createdAt).toLocaleDateString("en-GB")}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--foreground)] text-right">
                          {order.qty} tags
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--foreground)] text-right">
                          {formatPence(order.amountPence)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {orderStatusBadge(order.status)}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--muted-foreground)]">
                          {order.fulfilledAt
                            ? new Date(order.fulfilledAt).toLocaleDateString("en-GB")
                            : "\u2014"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generate Tags Modal */}
      {showGenerateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowGenerateModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-fade-in">
            <DialogContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-[var(--foreground)]">Generate QR Tags</div>
                  <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Create a batch of unique QR tags for certificates.
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowGenerateModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleGenerate} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Number of Tags *
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={generateCount}
                    onChange={(e) => setGenerateCount(e.target.value)}
                    placeholder="10"
                    required
                  />
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">Maximum 100 per batch</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Label Prefix (optional)
                  </label>
                  <Input
                    value={labelPrefix}
                    onChange={(e) => setLabelPrefix(e.target.value)}
                    placeholder="e.g. BATCH-2026-02"
                  />
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Tags will be labelled PREFIX-001, PREFIX-002, etc.
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setShowGenerateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={generating}>
                    {generating ? "Generating..." : "Generate Tags"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </div>
        </div>
      )}

      {/* Purchase Tags Modal */}
      {showPurchaseModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowPurchaseModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md animate-fade-in">
            <DialogContent>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-[var(--foreground)]">Buy QR Tags</div>
                  <div className="mt-1 text-sm text-[var(--muted-foreground)]">
                    Purchase a pack of QR tags via Stripe. Tags will be generated after payment.
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowPurchaseModal(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-6 space-y-3">
                {PACK_OPTIONS.map((pack) => (
                  <button
                    key={pack.qty}
                    type="button"
                    onClick={() => setSelectedPack(pack.qty)}
                    className={`w-full flex items-center justify-between rounded-lg border p-4 text-left transition-all ${
                      selectedPack === pack.qty
                        ? "border-[var(--primary)] bg-[var(--primary)]/5 ring-1 ring-[var(--primary)]"
                        : "border-[var(--border)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">{pack.label}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">
                        {formatPence(pack.qty * 50)} ({formatPence(50)}/tag)
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPack === pack.qty
                        ? "border-[var(--primary)] bg-[var(--primary)]"
                        : "border-[var(--border)]"
                    }`}>
                      {selectedPack === pack.qty && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-6">
                <Button type="button" variant="secondary" onClick={() => setShowPurchaseModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePurchase} disabled={purchasing}>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {purchasing ? "Redirecting..." : `Pay ${formatPence(selectedPack * 50)}`}
                </Button>
              </div>
            </DialogContent>
          </div>
        </div>
      )}
    </AppShell>
  );
}
