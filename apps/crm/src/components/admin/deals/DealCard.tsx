"use client";

import { DragEvent, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, User, Building } from "lucide-react";

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

type DealCardProps = {
  deal: Deal;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(value);
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d < new Date();
}

export default function DealCard({ deal }: DealCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", deal.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const expectedCloseDate = deal.expectedCloseDate;
  const overdue = isOverdue(expectedCloseDate);
  const contactName = deal.contact
    ? `${deal.contact.firstName} ${deal.contact.lastName}`
    : null;

  return (
    <Link href={`/admin/deals/${deal.id}`}>
      <div
        draggable="true"
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`rounded-xl border bg-[var(--background)] p-4 cursor-grab active:cursor-grabbing transition-all hover:border-[var(--primary)]/50 hover:shadow-md ${
          isDragging ? "opacity-50 scale-95 shadow-lg" : ""
        }`}
      >
        {/* Title */}
        <div className="font-medium text-sm text-[var(--foreground)] mb-2 line-clamp-2">
          {deal.title}
        </div>

        {/* Value */}
        <div className="flex items-center gap-1.5 text-[var(--foreground)] mb-3">
          <DollarSign className="w-4 h-4 text-[var(--primary)]" />
          <span className="font-bold">{formatCurrency(deal.value)}</span>
          {deal.probability != null && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {deal.probability}%
            </Badge>
          )}
        </div>

        {/* Meta Info */}
        <div className="space-y-1.5">
          {/* Contact or Client */}
          {(contactName || deal.client) && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              {contactName ? (
                <>
                  <User className="w-3.5 h-3.5" />
                  <span className="truncate">{contactName}</span>
                </>
              ) : deal.client ? (
                <>
                  <Building className="w-3.5 h-3.5" />
                  <span className="truncate">{deal.client.name}</span>
                </>
              ) : null}
            </div>
          )}

          {/* Expected Close Date */}
          {expectedCloseDate && (
            <div
              className={`flex items-center gap-1.5 text-xs ${
                overdue ? "text-red-600" : "text-[var(--muted-foreground)]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(expectedCloseDate)}</span>
              {overdue && <span className="font-medium">(Overdue)</span>}
            </div>
          )}

          {/* Owner */}
          {deal.owner && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{deal.owner.name}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
