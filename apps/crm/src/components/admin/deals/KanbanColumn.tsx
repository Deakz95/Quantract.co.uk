"use client";

import { DragEvent, useState } from "react";
import DealCard from "./DealCard";

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

type KanbanColumnProps = {
  stage: DealStage;
  deals: Deal[];
  onDrop: (dealId: string, toStageId: string) => void;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function KanbanColumn({ stage, deals, onDrop }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const dealId = e.dataTransfer.getData("text/plain");
    if (dealId) {
      onDrop(dealId, stage.id);
    }
  };

  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const stageColor = stage.color || "#6b7280";

  return (
    <div
      className={`flex-shrink-0 w-[320px] flex flex-col rounded-2xl border transition-all ${
        isDragOver
          ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-lg"
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: stageColor }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--foreground)] truncate">
                {stage.name}
              </span>
              <span className="flex-shrink-0 text-xs font-medium text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full">
                {deals.length}
              </span>
            </div>
            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {formatCurrency(totalValue)}
              {stage.probability != null && ` - ${stage.probability}%`}
            </div>
          </div>
        </div>
      </div>

      {/* Column Body - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[200px] max-h-[calc(100vh-280px)]">
        {deals.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-[var(--muted-foreground)] border-2 border-dashed border-[var(--border)] rounded-xl">
            Drop deals here
          </div>
        ) : (
          deals.map((deal) => <DealCard key={deal.id} deal={deal} />)
        )}
      </div>

      {/* Column Footer */}
      {(stage.isWon || stage.isLost) && (
        <div className="p-3 border-t border-[var(--border)]">
          <div
            className={`text-xs font-medium text-center py-1.5 rounded-lg ${
              stage.isWon
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {stage.isWon ? "Won Deals" : "Lost Deals"}
          </div>
        </div>
      )}
    </div>
  );
}
