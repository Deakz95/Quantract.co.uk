"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage, requireOk } from "@/lib/apiClient";
import { ArrowLeft, Calendar, PoundSterling, User, Building, FileText, Percent } from "lucide-react";
import DealForm from "@/components/admin/deals/DealForm";

type DealStage = {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  probability: number | null;
  isWon: boolean;
  isLost: boolean;
};

type Deal = {
  id: string;
  title: string;
  value: number;
  probability: number | null;
  expectedCloseDate: string | null;
  closedAt: string | null;
  lostReason: string | null;
  notes: string | null;
  source: string;
  stage: DealStage;
  contact?: { id: string; firstName: string; lastName: string };
  client?: { id: string; name: string };
  owner?: { id: string; name: string };
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const dealId = params.dealId as string;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const loadedRef = useRef(false);

  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => {
    const dealLabel = deal?.title ? deal.title : `Deal #${dealId.slice(0, 8)}`;
    return [
      { label: "Dashboard", href: "/admin" },
      { label: "Deals", href: "/admin/deals" },
      { label: dealLabel },
    ];
  }, [dealId, deal?.title]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [dealRes, stagesRes] = await Promise.all([
        apiRequest<{ ok: boolean; deal: Deal; error?: string }>(`/api/admin/deals/${dealId}`),
        apiRequest<{ ok: boolean; stages: DealStage[]; error?: string }>("/api/admin/deal-stages"),
      ]);

      if (!dealRes.ok) throw new Error(dealRes.error || "Failed to load deal");
      if (!stagesRes.ok) throw new Error(stagesRes.error || "Failed to load stages");

      setDeal(dealRes.deal);
      setStages(stagesRes.stages || []);
    } catch (error) {
      setLoadError(getApiErrorMessage(error, "Unable to load deal"));
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  const requestDelete = useCallback(() => {
    setConfirmDeleteOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await apiRequest<{ ok: boolean; error?: string }>(`/api/admin/deals/${dealId}`, {
        method: "DELETE",
      });

      requireOk(res, "Failed to delete deal");
      toast({ title: "Deal deleted", variant: "success" });
      router.push("/admin/deals");
    } catch (error) {
      toast({ title: getApiErrorMessage(error, "Failed to delete deal"), variant: "destructive" });
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  }, [dealId, toast, router]);

  const handleMoveStage = useCallback(
    async (toStageId: string) => {
      if (!deal) return;

      try {
        const res = await apiRequest<{ ok: boolean; error?: string }>(`/api/admin/deals/${dealId}/move-stage`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ toStageId }),
        });

        requireOk(res, "Failed to move deal");
        toast({ title: "Deal moved", variant: "success" });
        load();
      } catch (error) {
        toast({ title: getApiErrorMessage(error, "Failed to move deal"), variant: "destructive" });
      }
    },
    [deal, dealId, toast, load]
  );

  if (loading) {
    return (
      <AppShell role="admin" title="Deal Details" subtitle="Loading...">
        <Breadcrumbs items={breadcrumbItems} />
        <LoadingSkeleton />
      </AppShell>
    );
  }

  if (loadError || !deal) {
    return (
      <AppShell role="admin" title="Deal Details" subtitle="Error loading deal">
        <Breadcrumbs items={breadcrumbItems} />
        <ErrorState title="Unable to load deal" description={loadError || "Deal not found"} onRetry={load} />
      </AppShell>
    );
  }

  const stageColor = deal.stage.color || "#6b7280";

  return (
    <AppShell role="admin" title={deal.title} subtitle="Deal details and management">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/admin/deals">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div>
                  <CardTitle>{deal.title}</CardTitle>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      style={{
                        backgroundColor: `${stageColor}20`,
                        color: stageColor,
                        borderColor: stageColor,
                      }}
                      className="border"
                    >
                      {deal.stage.name}
                    </Badge>
                    {deal.stage.isWon && <Badge className="bg-green-100 text-green-800">Won</Badge>}
                    {deal.stage.isLost && <Badge className="bg-red-100 text-red-800">Lost</Badge>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Button variant="destructive" onClick={requestDelete} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <PoundSterling className="w-5 h-5 text-[var(--muted-foreground)] mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--muted-foreground)]">Value</div>
                      <div className="text-lg font-bold text-[var(--foreground)]">{formatCurrency(deal.value)}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Percent className="w-5 h-5 text-[var(--muted-foreground)] mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--muted-foreground)]">Probability</div>
                      <div className="text-lg font-bold text-[var(--foreground)]">
                        {deal.probability != null ? `${deal.probability}%` : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-[var(--muted-foreground)] mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--muted-foreground)]">Expected Close</div>
                      <div className="text-sm text-[var(--foreground)]">{formatDate(deal.expectedCloseDate)}</div>
                    </div>
                  </div>

                  {deal.closedAt && (
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-[var(--muted-foreground)] mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-[var(--muted-foreground)]">Closed At</div>
                        <div className="text-sm text-[var(--foreground)]">{formatDate(deal.closedAt)}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-[var(--muted-foreground)] mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--muted-foreground)]">Source</div>
                      <div className="text-sm text-[var(--foreground)]">{deal.source || "-"}</div>
                    </div>
                  </div>
                </div>

                {deal.notes && (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Notes</div>
                    <div className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{deal.notes}</div>
                  </div>
                )}

                {deal.lostReason && (
                  <div className="mt-6 pt-6 border-t border-[var(--border)]">
                    <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Lost Reason</div>
                    <div className="text-sm text-red-600">{deal.lostReason}</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Contacts/Clients */}
            <Card>
              <CardHeader>
                <CardTitle>Related</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deal.contact && (
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <div>
                        <div className="text-xs font-semibold text-[var(--muted-foreground)]">Contact</div>
                        <div className="text-sm text-[var(--foreground)]">
                          {deal.contact.firstName} {deal.contact.lastName}
                        </div>
                      </div>
                    </div>
                  )}

                  {deal.client && (
                    <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <div>
                        <div className="text-xs font-semibold text-[var(--muted-foreground)]">Client</div>
                        <Link
                          href={`/admin/clients/${deal.client.id}`}
                          className="text-sm text-[var(--primary)] hover:underline"
                        >
                          {deal.client.name}
                        </Link>
                      </div>
                    </div>
                  )}

                  {deal.owner && (
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-[var(--muted-foreground)]" />
                      <div>
                        <div className="text-xs font-semibold text-[var(--muted-foreground)]">Owner</div>
                        <div className="text-sm text-[var(--foreground)]">{deal.owner.name}</div>
                      </div>
                    </div>
                  )}

                  {!deal.contact && !deal.client && !deal.owner && (
                    <div className="text-sm text-[var(--muted-foreground)]">No related contacts or clients</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Move Stage */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Move to Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stages.map((stage) => {
                    const isCurrentStage = stage.id === deal.stage.id;
                    const color = stage.color || "#6b7280";

                    return (
                      <button
                        key={stage.id}
                        onClick={() => !isCurrentStage && handleMoveStage(stage.id)}
                        disabled={isCurrentStage}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          isCurrentStage
                            ? "border-[var(--primary)] bg-[var(--primary)]/5"
                            : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-[var(--foreground)]">{stage.name}</div>
                            {stage.probability != null && (
                              <div className="text-xs text-[var(--muted-foreground)]">
                                {stage.probability}% probability
                              </div>
                            )}
                          </div>
                          {isCurrentStage && (
                            <Badge className="text-xs">Current</Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <DealForm
        open={editOpen}
        onOpenChange={setEditOpen}
        deal={deal}
        stages={stages}
        onSuccess={() => {
          setEditOpen(false);
          load();
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete deal?"
        message={`This will permanently delete "${deal.title}". This action cannot be undone.`}
        confirmLabel="Delete deal"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        busy={deleting}
      />
    </AppShell>
  );
}
