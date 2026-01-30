"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KanbanBoardSkeleton } from "@/components/ui/CardSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage, requireOk } from "@/lib/apiClient";
import { Plus, Settings, Target } from "lucide-react";
import KanbanColumn from "./KanbanColumn";
import DealForm from "./DealForm";
import StageSettingsDialog from "./StageSettingsDialog";

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

type StageWithDeals = DealStage & {
  deals: Deal[];
};

export default function KanbanBoard() {
  const { toast } = useToast();
  const loadedRef = useRef(false);

  const [stagesWithDeals, setStagesWithDeals] = useState<StageWithDeals[]>([]);
  const [stages, setStages] = useState<DealStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [stageSettingsOpen, setStageSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [dealsRes, stagesRes] = await Promise.all([
        apiRequest<{ ok: boolean; stages: StageWithDeals[]; error?: string }>(
          "/api/admin/deals?groupByStage=true",
          { cache: "no-store" }
        ),
        apiRequest<{ ok: boolean; stages: DealStage[]; error?: string }>(
          "/api/admin/deal-stages",
          { cache: "no-store" }
        ),
      ]);

      if (!dealsRes.ok) throw new Error(dealsRes.error || "Failed to load deals");
      if (!stagesRes.ok) throw new Error(stagesRes.error || "Failed to load stages");

      setStagesWithDeals(dealsRes.stages || []);
      setStages(stagesRes.stages || []);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to load deals");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  const handleDrop = useCallback(
    async (dealId: string, toStageId: string) => {
      // Optimistic update
      const prevStages = [...stagesWithDeals];

      // Find the deal in current stages
      let movedDeal: Deal | null = null;
      const updatedStages = stagesWithDeals.map((stage) => {
        const deals = stage.deals ?? [];
        const dealIndex = deals.findIndex((d) => d.id === dealId);
        if (dealIndex !== -1) {
          movedDeal = { ...deals[dealIndex] };
          return {
            ...stage,
            deals: deals.filter((d) => d.id !== dealId),
          };
        }
        return stage;
      });

      if (!movedDeal) return;

      // Add deal to target stage
      const targetStage = stages.find((s) => s.id === toStageId);
      if (!targetStage) return;

      const finalStages = updatedStages.map((stage) => {
        if (stage.id === toStageId) {
          return {
            ...stage,
            deals: [
              ...(stage.deals ?? []),
              { ...movedDeal!, stage: targetStage },
            ],
          };
        }
        return stage;
      });

      setStagesWithDeals(finalStages);

      // API call
      try {
        const res = await apiRequest<{ ok: boolean; error?: string }>(
          `/api/admin/deals/${dealId}/move-stage`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ toStageId }),
          }
        );

        requireOk(res, "Failed to move deal");
        toast({ title: "Deal moved", variant: "success" });
      } catch (error) {
        // Revert on error
        setStagesWithDeals(prevStages);
        toast({ title: getApiErrorMessage(error, "Failed to move deal"), variant: "destructive" });
      }
    },
    [stagesWithDeals, stages, toast]
  );

  if (loading && !loadedRef.current) {
    return <KanbanBoardSkeleton columns={4} />;
  }

  if (loadError) {
    const isDbError = loadError.toLowerCase().includes("database") ||
                      loadError.toLowerCase().includes("table") ||
                      loadError.toLowerCase().includes("does not exist");
    return (
      <ErrorState
        title="Unable to load deals pipeline"
        description={isDbError
          ? "This feature requires database configuration. The deals and deal stages tables may not be set up yet."
          : loadError
        }
        helpText="Contact support if this persists: support@quantract.co.uk"
        onRetry={load}
        showSupport={true}
      />
    );
  }

  const totalDeals = stagesWithDeals.reduce((sum, s) => sum + (s.deals ?? []).length, 0);
  const totalValue = stagesWithDeals.reduce(
    (sum, s) => sum + (s.deals ?? []).reduce((dSum, d) => dSum + d.value, 0),
    0
  );

  return (
    <div>
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="text-sm text-[var(--muted-foreground)]">
            <span className="font-semibold text-[var(--foreground)]">{totalDeals}</span> deals worth{" "}
            <span className="font-semibold text-[var(--foreground)]">
              {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(totalValue)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setStageSettingsOpen(true)}>
            <Settings className="w-4 h-4 mr-1.5" />
            Stages
          </Button>
          <Button variant="secondary" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {stagesWithDeals.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Target}
              title="No deals yet"
              description="Track your sales pipeline with deals. Create pipeline stages to visualise opportunities from lead to close."
              features={[
                "Drag and drop deals through customisable pipeline stages",
                "Track deal value, probability, and expected close dates",
                "Link deals to contacts and clients for full context"
              ]}
              primaryAction={{ label: "Set up pipeline stages", onClick: () => setStageSettingsOpen(true) }}
              secondaryAction={{ label: "Learn more", href: "/admin/help/deals" }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stagesWithDeals.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={stage.deals ?? []}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {/* Create Deal Dialog */}
      <DealForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        stages={stages}
        onSuccess={() => {
          setCreateOpen(false);
          load();
        }}
      />

      {/* Stage Settings Dialog */}
      <StageSettingsDialog
        open={stageSettingsOpen}
        onOpenChange={setStageSettingsOpen}
        onSuccess={load}
      />
    </div>
  );
}
